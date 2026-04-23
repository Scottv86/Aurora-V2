import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Panel,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import '@xyflow/react/dist/style.css';
import { 
  GitFork, Zap, Activity, Clock, Play, Save, Settings2, Trash2, Bug, Info, ChevronRight, 
  Search, Layout as LayoutIcon, Wand2, Mail, MessageSquare, RefreshCw, FileText, Globe, Sparkles as SparklesIcon, X as CloseIcon,
  Bot
} from 'lucide-react';
import { Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeType } from '../../../types/platform';
import { WorkflowDebugger } from './WorkflowDebugger';
import { CustomWorkflowNode } from './CustomNode';
import { CustomWorkflowEdge } from './CustomEdge';
import { CustomWorkflowZone } from './CustomZone';
import { cn } from '../../../lib/utils';
import dagre from 'dagre';

const ACTION_LIBRARY = [
  { id: 'EMAIL', label: 'Send Email', desc: 'Dispatch templated emails to users or customers.', icon: Mail, color: 'indigo' },
  { id: 'SLACK', label: 'Slack Message', desc: 'Post real-time updates to workspace channels.', icon: MessageSquare, color: 'emerald' },
  { id: 'UPDATE', label: 'Update Record', desc: 'Automatically modify fields on the current record.', icon: RefreshCw, color: 'blue' },
  { id: 'PDF', label: 'Generate PDF', desc: 'Create professional documents from record data.', icon: FileText, color: 'rose' },
  { id: 'WEBHOOK', label: 'Outbound Webhook', desc: 'Push data to external systems and APIs.', icon: Globe, color: 'zinc' },
  { id: 'AI_SUMMARIZE', label: 'AI Summarize', desc: 'Generate intelligent summaries using LLMs.', icon: SparklesIcon, color: 'amber' },
  { id: 'AI_AGENT', label: 'Trigger AI Agent', desc: 'Hand off the record to an autonomous agent for complex reasoning.', icon: Bot, color: 'violet' },
];

interface GraphEditorProps {
  workflow?: Workflow;
  onChange: (workflow: Workflow) => void;
  showDebugger: boolean;
  setShowDebugger: (show: boolean) => void;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  selectedEdgeId: string | null;
  onEdgeSelect: (id: string | null) => void;
  rightSidebarTab: 'inspector' | 'debugger' | 'architect';
  setRightSidebarTab: (tab: 'inspector' | 'debugger' | 'architect') => void;
}

const nodeTypes = {
  workflowNode: CustomWorkflowNode,
  workflowZone: CustomWorkflowZone,
};

const edgeTypes = {
  workflowEdge: CustomWorkflowEdge,
};

export const WorkflowGraphEditorContent: React.FC<GraphEditorProps> = ({ 
  workflow, 
  onChange, 
  showDebugger, 
  setShowDebugger,
  selectedNodeId,
  onNodeSelect,
  selectedEdgeId,
  onEdgeSelect,
  rightSidebarTab,
  setRightSidebarTab
}) => {
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionSearchQuery, setActionSearchQuery] = React.useState('');
  const [showActionModal, setShowActionModal] = React.useState(false);

  const initialNodes = useMemo(() => 
    workflow?.nodes.map(n => ({
      id: n.id,
      type: n.type === 'ZONE' ? 'workflowZone' : 'workflowNode',
      data: { 
        label: n.name, 
        type: n.type,
        onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
      },
      position: n.position || { x: 0, y: 0 },
      ...(n.type === 'ZONE' ? { width: 600, height: 400 } : {})
    })) || [], [workflow]);

  const initialEdges = useMemo(() => 
    workflow?.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.condition,
      type: 'workflowEdge',
      animated: true,
      className: "stroke-zinc-400 dark:stroke-zinc-600"
    })) || [], [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onLayout = useCallback((direction: 'TB' | 'LR' = 'TB') => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranker: 'network-simplex', nodesep: 100, ranksep: 100 });

    currentNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 100 });
    });

    currentEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = currentNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 110,
          y: nodeWithPosition.y - 50,
        },
      };
    });

    setNodes(layoutedNodes);
  }, [getNodes, getEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'workflowEdge', animated: true }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: WorkflowNodeType, position = { x: 100, y: 100 }, parentId?: string) => {
    const id = `node-${Date.now()}`;
    const newNode: any = {
      id,
      type: type === 'ZONE' ? 'workflowZone' : 'workflowNode',
      position,
      parentId,
      extent: parentId ? 'parent' : undefined,
      data: { 
        label: `New ${type}`, 
        type,
        onDelete: (id: string) => setNodes((nds) => nds.filter(node => node.id !== id))
      },
      ...(type === 'ZONE' ? { width: 600, height: 400 } : {})
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Check if dropped inside a Zone
      const zones = getNodes().filter(n => n.type === 'workflowZone');
      const parentZone = zones.find(zone => {
        const { x, y } = zone.position;
        const width = zone.width || 600;
        const height = zone.height || 400;
        return (
          position.x >= x && 
          position.x <= x + width && 
          position.y >= y && 
          position.y <= y + height
        );
      });

      if (parentZone) {
        const relativePosition = {
          x: position.x - parentZone.position.x,
          y: position.y - parentZone.position.y,
        };
        addNode(type, relativePosition, parentZone.id);
      } else {
        addNode(type, position);
      }
    },
    [screenToFlowPosition, addNode, getNodes]
  );

  const onNodeDragStop = useCallback((_: any, node: any) => {
    if (node.type === 'workflowZone') return;

    const zones = getNodes().filter(n => n.type === 'workflowZone' && n.id !== node.id);
    const parentZone = zones.find(zone => {
      const { x, y } = zone.position;
      const width = zone.width || 600;
      const height = zone.height || 400;
      
      // Use absolute position for check
      const absPos = node.parentId 
        ? { x: node.position.x + x, y: node.position.y + y }
        : node.position;

      return (
        absPos.x >= x && 
        absPos.x <= x + width && 
        absPos.y >= y && 
        absPos.y <= y + height
      );
    });

    if (parentZone && node.parentId !== parentZone.id) {
      // Move into Zone
      setNodes(nds => nds.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            parentId: parentZone.id,
            position: {
              x: node.position.x - parentZone.position.x,
              y: node.position.y - parentZone.position.y,
            },
            extent: 'parent'
          };
        }
        return n;
      }));
    } else if (!parentZone && node.parentId) {
      // Move out of Zone
      const parent = getNodes().find(n => n.id === node.parentId);
      if (parent) {
        setNodes(nds => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: undefined,
              position: {
                x: node.position.x + parent.position.x,
                y: node.position.y + parent.position.y,
              },
              extent: undefined
            };
          }
          return n;
        }));
      }
    }
  }, [getNodes, setNodes]);

  const handleSave = () => {
    const updatedWorkflow: Workflow = {
      id: workflow?.id || `wf-${Date.now()}`,
      name: workflow?.name || 'New Workflow',
      nodes: nodes.map(n => ({
        id: n.id,
        name: n.data.label as string,
        type: n.data.type as WorkflowNodeType,
        position: n.position
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: e.label as string
      }))
    };
    onChange(updatedWorkflow);
  };

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 flex flex-col relative overflow-hidden">

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Node Library */}
        <div className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
          {/* Search Header - Exactly like Builder */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search nodes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <Settings2 size={12} />
                Node Library
              </h3>
              <p className="text-[10px] text-zinc-500 px-1 italic">Drag or click to add nodes</p>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
            {[
              { type: 'START', icon: Play, label: 'Entry Point', color: 'indigo', desc: 'Where the record journey begins' },
              { type: 'STATUS', icon: Activity, label: 'State Node', color: 'indigo', desc: 'A resting phase for the record' },
              { type: 'DECISION', icon: GitFork, label: 'Decision Gate', color: 'amber', desc: 'Conditional logic branching' },
              { type: 'ACTION', icon: Zap, label: 'Action Module', color: 'emerald', desc: 'Automated side-effects' },
              { type: 'DELAY', icon: Clock, label: 'Wait/SLA', color: 'zinc', desc: 'Pauses execution for a duration' },
              { type: 'ZONE', icon: LayoutIcon, label: 'Logical Zone', color: 'indigo', desc: 'Group related steps by team or stage' },
              { type: 'END', icon: Trash2, label: 'Exit Point', color: 'rose', desc: 'Marks the end of execution' },
            ].filter(item => 
              item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.desc.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((item) => (
              <button
                key={item.type}
                draggable
                onDragStart={(event) => onDragStart(event, item.type)}
                onClick={() => addNode(item.type as WorkflowNodeType)}
                className={cn(
                  "group flex flex-col gap-2 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                  "bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl transition-colors", `bg-${item.color}-500/10 text-${item.color}-500 group-hover:bg-${item.color}-500 group-hover:text-white`)}>
                    <item.icon size={16} />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.label}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed pl-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Selection Modal */}
      <AnimatePresence>
        {showActionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[40px] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl text-white">
                      <Zap size={20} fill="currentColor" />
                    </div>
                    Automation Library
                  </h2>
                  <p className="text-sm text-zinc-500">Choose an action to perform when this step is reached.</p>
                </div>
                <button 
                  onClick={() => setShowActionModal(false)}
                  className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              {/* Modal Search Bar */}
              <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text"
                    placeholder="Search for an integration (e.g. Email, Slack, AI...)"
                    value={actionSearchQuery}
                    onChange={(e) => setActionSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  {ACTION_LIBRARY.filter(action => 
                    action.label.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
                    action.desc.toLowerCase().includes(actionSearchQuery.toLowerCase())
                  ).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNodeId 
                            ? { ...node, data: { ...node.data, actionType: action.id } }
                            : node
                        ));
                        setShowActionModal(false);
                      }}
                      className={cn(
                        "group flex flex-col gap-4 p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                        nodes.find(n => n.id === selectedNodeId)?.data.actionType === action.id
                          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/5 dark:border-indigo-500/30 ring-2 ring-indigo-500"
                          : "bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          "p-3 rounded-2xl transition-colors",
                          `bg-${action.color}-500/10 text-${action.color}-500 group-hover:bg-${action.color}-500 group-hover:text-white`
                        )}>
                          <action.icon size={24} />
                        </div>
                        {nodes.find(n => n.id === selectedNodeId)?.data.actionType === action.id && (
                          <div className="px-3 py-1 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                            Active
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 dark:text-white">{action.label}</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">{action.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold italic">
                  More integrations coming soon
                </p>
                <button 
                  onClick={() => setShowActionModal(false)}
                  className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                >
                  Confirm Selection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


        <div className="flex-1 relative bg-zinc-50 dark:bg-[#09090b]" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={({ nodes, edges }) => {
              if (nodes.length > 0) {
                onNodeSelect(nodes[0].id);
                onEdgeSelect(null);
                setRightSidebarTab('inspector');
                setShowDebugger(true);
              } else if (edges.length > 0) {
                onEdgeSelect(edges[0].id);
                onNodeSelect(null);
                setRightSidebarTab('inspector');
                setShowDebugger(true);
              }
            }}
            onPaneClick={() => {
              onNodeSelect(null);
              onEdgeSelect(null);
            }}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={25} size={1} color="#27272a" />
            <Controls className="!bg-white !dark:bg-zinc-900 !border-zinc-200 !dark:border-zinc-800 !rounded-xl !shadow-2xl" />
            <MiniMap 
              className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-2xl overflow-hidden" 
              nodeStrokeColor={(n: any) => '#18181b'}
              nodeColor={(n: any) => {
                if (n.data?.type === 'STATUS') return '#4f46e5';
                if (n.data?.type === 'DECISION') return '#f59e0b';
                if (n.data?.type === 'ACTION') return '#10b981';
                return '#3f3f46';
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
          </ReactFlow>

          {/* Floating Action Hint & Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <div className="px-6 py-3 bg-zinc-900/90 text-white rounded-full backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                 <Play size={12} fill="currentColor" />
                 <span>Live Canvas</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <p className="text-[10px] font-medium text-zinc-400 italic">Drag nodes to define record journeys</p>
            </div>

            <button 
              onClick={() => onLayout('TB')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-all flex items-center gap-2 border border-indigo-400/50 group"
            >
              <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Magic Format</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar: Dual-Mode Inspector/Debugger */}
        <AnimatePresence mode="wait">
          {showDebugger && workflow && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-96 h-full z-20 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden"
            >
              {/* Tab Switcher */}
              <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center p-1 bg-zinc-50/50 dark:bg-transparent">
                <div className="flex-1 grid grid-cols-3 gap-1 h-full">
                  {[
                    { id: 'inspector', label: 'Inspector', icon: Settings2 },
                    { id: 'debugger', label: 'Debugger', icon: Bug },
                    { id: 'architect', label: 'Architect', icon: SparklesIcon },
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setRightSidebarTab(tab.id as any)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                        rightSidebarTab === tab.id 
                          ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-800" 
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {rightSidebarTab === 'inspector' ? (
                  <div className="p-6 space-y-8">
                    {!selectedNodeId && !selectedEdgeId ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                          <Settings2 size={24} className="text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">Nothing Selected</p>
                          <p className="text-[10px] text-zinc-500">Select a node or connection on the canvas to configure properties.</p>
                        </div>
                      </div>
                    ) : selectedNodeId ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {nodes.find(n => n.id === selectedNodeId)?.type === 'workflowZone' ? (
                          /* Zone Specific Configuration */
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Zone Configuration</h4>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Zone Name</label>
                                <input 
                                  type="text"
                                  value={nodes.find(n => n.id === selectedNodeId)?.data.label || ''}
                                  onChange={(e) => {
                                    const newLabel = e.target.value;
                                    setNodes((nds) => nds.map((node) => {
                                      if (node.id === selectedNodeId) {
                                        return { ...node, data: { ...node.data, label: newLabel } };
                                      }
                                      return node;
                                    }));
                                  }}
                                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="e.g. Finance Team"
                                />
                              </div>

                              <div className="space-y-3">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Theme Color</label>
                                <div className="grid grid-cols-6 gap-2">
                                  {['indigo', 'emerald', 'amber', 'rose', 'violet', 'zinc'].map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => {
                                        setNodes((nds) => nds.map((node) => {
                                          if (node.id === selectedNodeId) {
                                            return { ...node, data: { ...node.data, color } };
                                          }
                                          return node;
                                        }));
                                      }}
                                      className={cn(
                                        "h-8 rounded-lg transition-all border-2",
                                        color === 'indigo' && "bg-indigo-500 border-indigo-400",
                                        color === 'emerald' && "bg-emerald-500 border-emerald-400",
                                        color === 'amber' && "bg-amber-500 border-amber-400",
                                        color === 'rose' && "bg-rose-500 border-rose-400",
                                        color === 'violet' && "bg-violet-500 border-violet-400",
                                        color === 'zinc' && "bg-zinc-500 border-zinc-400",
                                        nodes.find(n => n.id === selectedNodeId)?.data.color === color ? "ring-4 ring-indigo-500/20 scale-110" : "opacity-40 hover:opacity-100"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard Node Configuration */
                          <div className="space-y-8">
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Node Configuration</h4>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Node Name</label>
                            <input 
                              type="text"
                              value={nodes.find(n => n.id === selectedNodeId)?.data.label as string}
                              onChange={(e) => {
                                setNodes(nds => nds.map(node => 
                                  node.id === selectedNodeId 
                                    ? { ...node, data: { ...node.data, label: e.target.value } }
                                    : node
                                ));
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>

                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                             <div className="flex items-center gap-2 mb-2 text-indigo-400">
                               <Info size={12} />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Type: {nodes.find(n => n.id === selectedNodeId)?.data.type}</span>
                             </div>
                             <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                               This node represents a {nodes.find(n => n.id === selectedNodeId)?.data.type.toLowerCase()} in the record's journey.
                             </p>
                          </div>
                        </div>

                        {/* Node Specific Config */}
                        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                           <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Logic & Payload</h4>
                           
                           {nodes.find(n => n.id === selectedNodeId)?.data.type === 'ACTION' ? (
                             <div className="space-y-4">
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Selected Action</label>
                                 <button 
                                   onClick={() => setShowActionModal(true)}
                                   className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-sm transition-all hover:border-indigo-500 group"
                                 >
                                   <div className="flex items-center gap-3">
                                     <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                       {(() => {
                                         const currentAction = ACTION_LIBRARY.find(a => a.id === nodes.find(n => n.id === selectedNodeId)?.data.actionType);
                                         const Icon = currentAction?.icon || Zap;
                                         return <Icon size={16} />;
                                       })()}
                                     </div>
                                     <div className="text-left">
                                       <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                         {ACTION_LIBRARY.find(a => a.id === nodes.find(n => n.id === selectedNodeId)?.data.actionType)?.label || 'Select an Action'}
                                       </p>
                                       <p className="text-[10px] text-zinc-500">Click to change automation</p>
                                     </div>
                                   </div>
                                   <ChevronRight size={14} className="text-zinc-400" />
                                 </button>
                               </div>

                               {nodes.find(n => n.id === selectedNodeId)?.data.actionType ? (
                                 <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                   <div className="flex items-center gap-2 text-indigo-500">
                                     <Zap size={12} />
                                     <span className="text-[10px] font-bold uppercase tracking-widest">Action Configuration</span>
                                   </div>
                                   <div className="p-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center">
                                      <Settings2 size={24} className="text-zinc-200 dark:text-zinc-800 mb-2" />
                                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Configuration UI for {nodes.find(n => n.id === selectedNodeId)?.data.actionType} Coming Soon</p>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-center">
                                    <Zap size={32} className="text-zinc-200 dark:text-zinc-800 mb-4" />
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em]">Select an action type above</p>
                                 </div>
                               )}
                             </div>
                              ) : (
                                <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-center">
                                  <GitFork size={32} className="text-zinc-200 dark:text-zinc-800 mb-4" />
                                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em]">Config Coming Soon</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedEdgeId ? (
                      /* Edge Inspector */
                      <div className="space-y-6">
                        <div className="space-y-6">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Connection Path</h4>
                          
                          {/* From/To Nodes Display */}
                          <div className="flex items-center gap-3 px-1">
                            <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">From Step</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {nodes.find(n => n.id === edges.find(e => e.id === selectedEdgeId)?.source)?.data.label as string || 'Unknown'}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-300" />
                            <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">To Step</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {nodes.find(n => n.id === edges.find(e => e.id === selectedEdgeId)?.target)?.data.label as string || 'Unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Branching Logic</h4>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Condition Expression</label>
                              <textarea 
                                value={edges.find(e => e.id === selectedEdgeId)?.label as string || ''}
                                onChange={(e) => {
                                  setEdges(eds => eds.map(edge => 
                                    edge.id === selectedEdgeId 
                                      ? { ...edge, label: e.target.value }
                                      : edge
                                  ));
                                }}
                                placeholder="e.g. record.amount > 5000"
                                className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-indigo-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                              />
                              <p className="text-[10px] text-zinc-500 italic px-1">
                                This logic determines if a record follows this path. Leave empty for unconditional transitions.
                              </p>
                            </div>

                            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                               <div className="flex items-center gap-2 text-amber-500">
                                 <SparklesIcon size={12} />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">AI Tip</span>
                               </div>
                               <p className="text-[10px] text-zinc-500 leading-relaxed">
                                 You can use any record field here. Example: <code className="text-amber-600 font-bold">record.priority === 'High'</code>
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : rightSidebarTab === 'debugger' ? (
                  <WorkflowDebugger workflow={workflow} />
                ) : (
                  <div className="p-6 h-full flex flex-col">
                     <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center">
                           <SparklesIcon size={24} className="text-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <h4 className="text-sm font-bold text-white">Shadow Architect</h4>
                           <p className="text-[10px] text-zinc-500 px-4">The Shadow Architect is ready to help you optimize this graph.</p>
                        </div>
                        <div className="w-full mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left">
                           <p className="text-[11px] text-indigo-400 font-mono mb-2">shadow@aurora:~$</p>
                           <p className="text-[10px] text-zinc-500 leading-relaxed">Describe the workflow in natural language and I will construct the graph for you.</p>
                        </div>
                     </div>
                     <div className="mt-auto pt-6 border-t border-zinc-800">
                        <div className="relative">
                           <input 
                              type="text"
                              placeholder="Describe your workflow..."
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                           />
                           <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg">
                              <SparklesIcon size={12} />
                           </button>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export const WorkflowGraphEditor: React.FC<GraphEditorProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowGraphEditorContent {...props} />
  </ReactFlowProvider>
);


