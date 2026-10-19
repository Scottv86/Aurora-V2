import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Connection,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Database, 
  Layers, 
  Key, 
  Link2, 
  RefreshCw, 
  XCircle
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { toast } from 'sonner';

// Custom ERD Table Node Component
const ErdTableNode: React.FC<{ data: any }> = ({ data }) => {
  const { module } = data;
  const fields = (module as any)?.schema?.fields || [];

  return (
    <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl shadow-xl min-w-[260px] overflow-hidden transition-all text-xs font-sans">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white dark:border-zinc-900 !rounded-full" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white dark:border-zinc-900 !rounded-full" />
      
      {/* Table Header */}
      <div className="p-3 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers size={14} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 dark:text-white leading-tight">{module.name}</h4>
            <span className="text-[10px] text-zinc-400 font-mono">{module.id.slice(-6)}</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {fields.length + 1} cols
        </span>
      </div>

      {/* Field List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-64 overflow-y-auto">
        {/* Primary Key */}
        <div className="px-3 py-1.5 flex items-center justify-between bg-amber-550/5">
          <div className="flex items-center gap-1.5">
            <Key size={11} className="text-amber-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">id</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400 font-semibold">CUID (PK)</span>
        </div>

        {/* Dynamic Fields */}
        {fields.map((f: any, idx: number) => {
          const isLookup = f.type === 'lookup' || f.type === 'relationship';
          return (
            <div key={idx} className="px-3 py-1.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                {isLookup ? (
                  <Link2 size={11} className="text-indigo-500 shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                )}
                <span className={`truncate font-medium ${isLookup ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {f.name || f.label}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 ml-2 shrink-0">
                {f.type || 'text'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const nodeTypes = {
  erdTable: ErdTableNode
};

export const VisualErdCanvas: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { modules, refreshModules, tenant } = usePlatform();
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [relationshipType, setRelationshipType] = useState<'LOOKUP' | 'MASTER_DETAIL'>('LOOKUP');
  const [relationFieldName, setRelationFieldName] = useState('');

  // Generate Initial Nodes & Edges from real platform modules
  const initialData = useMemo(() => {
    const dataModules = (modules || []).filter((m: any) => m.type !== 'PAGE' && m.type !== 'SITE');
    const cols = 3;
    const spacingX = 340;
    const spacingY = 280;

    const nodes: Node[] = dataModules.map((m: any, index: number) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      return {
        id: m.id,
        type: 'erdTable',
        position: { x: 50 + col * spacingX, y: 50 + row * spacingY },
        data: { module: m }
      };
    });

    const edges: Edge[] = [];
    dataModules.forEach((m: any) => {
      const fields = m.schema?.fields || [];
      fields.forEach((f: any) => {
        if ((f.type === 'lookup' || f.type === 'relationship') && f.targetModuleId) {
          edges.push({
            id: `edge_${m.id}_${f.targetModuleId}_${f.name}`,
            source: m.id,
            target: f.targetModuleId,
            label: f.name || 'references',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6366f1'
            }
          });
        }
      });
    });

    return { nodes, edges };
  }, [modules]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  const onConnect = useCallback((params: Connection) => {
    if (params.source === params.target) return;
    setPendingConnection(params);
    const targetMod = modules.find((m: any) => m.id === params.target);
    const targetName = targetMod?.name ? `${targetMod.name.toLowerCase()}Id` : 'relatedRecordId';
    setRelationFieldName(targetName);
    setIsRelationshipModalOpen(true);
  }, [modules]);

  const handleCreateRelationship = async () => {
    if (!pendingConnection || !pendingConnection.source || !pendingConnection.target) return;

    try {
      const sourceMod = modules.find((m: any) => m.id === pendingConnection.source);
      const targetMod = modules.find((m: any) => m.id === pendingConnection.target);

      if (!sourceMod || !targetMod) return;

      const newField = {
        name: relationFieldName || `${targetMod.name.toLowerCase()}Id`,
        label: targetMod.name,
        type: 'lookup',
        targetModuleId: targetMod.id,
        relationshipType,
        isCascadeDelete: relationshipType === 'MASTER_DETAIL'
      };

      const updatedFields = [...(((sourceMod as any).schema?.fields) || []), newField];
      const updatedModule = {
        ...sourceMod,
        schema: {
          ...(sourceMod as any).schema,
          fields: updatedFields
        }
      };

      await fetch(`/api/data/modules/${sourceMod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(updatedModule)
      });
      await refreshModules();

      setEdges((eds) => addEdge({
        ...pendingConnection,
        label: newField.label,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
      }, eds));

      toast.success(`Connected ${sourceMod.name} ➔ ${targetMod.name} (${relationshipType === 'MASTER_DETAIL' ? 'Master-Detail' : '1:N Lookup'})!`);
      setIsRelationshipModalOpen(false);
      setPendingConnection(null);
    } catch (e: any) {
      toast.error('Failed to create relational schema link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 text-white animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="h-14 px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Visual Entity-Relationship (ERD) Schema Canvas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Interactive Graph
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Drag lines between module nodes to create live relational lookups, foreign keys, and rollups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              toast.info('Auto-aligning ERD schema nodes...');
              setNodes(initialData.nodes);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={13} />
            <span>Reset Layout</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ReactFlow Canvas Viewport */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3f3f46" />
          <Controls className="!bg-zinc-900 !border-zinc-800 !text-white !rounded-xl !shadow-xl [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button:hover]:!bg-zinc-800" />
          <MiniMap 
            nodeColor="#6366f1"
            className="!bg-zinc-900 !border-zinc-800 !rounded-2xl !shadow-xl"
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
      </div>

      {/* Relationship Configuration Modal */}
      {isRelationshipModalOpen && pendingConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Link2 size={18} />
                </div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Create Relational Link</h3>
              </div>
              <button onClick={() => setIsRelationshipModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <XCircle size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Link records between <strong className="text-zinc-900 dark:text-white">
                {modules.find((m: any) => m.id === pendingConnection.source)?.name}
              </strong> and <strong className="text-zinc-900 dark:text-white">
                {modules.find((m: any) => m.id === pendingConnection.target)?.name}
              </strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Foreign Key Field Identifier
                </label>
                <input
                  type="text"
                  value={relationFieldName}
                  onChange={(e) => setRelationFieldName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Relationship Cardinality &amp; Integrity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelationshipType('LOOKUP')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      relationshipType === 'LOOKUP'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-1 ring-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <p className="text-xs font-black">1:N Lookup</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Loose association. Deleting parent leaves child intact.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRelationshipType('MASTER_DETAIL')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      relationshipType === 'MASTER_DETAIL'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-1 ring-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <p className="text-xs font-black">Master-Detail</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Cascade delete and rollup calculations supported.</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsRelationshipModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRelationship}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Create Relationship
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VisualErdCanvas;
