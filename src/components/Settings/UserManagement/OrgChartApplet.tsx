import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { usePositions, Position } from '../../../hooks/usePositions';
import { Briefcase, Users, ZoomIn, ZoomOut, Maximize, Search, ChevronRight, User, Cpu } from 'lucide-react';
import { Badge, Button } from '../../UI/Primitives';
import { motion, AnimatePresence } from 'framer-motion';

interface TreeNode extends d3.HierarchyNode<Position> {
  x: number;
  y: number;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const HORIZONTAL_SPACING = 280;
const VERTICAL_SPACING = 180;

const VIRTUAL_ROOT_ID = 'virtual-root';

export const OrgChartApplet = () => {
  const navigate = useNavigate();
  const { positions, loading } = usePositions();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process data into hierarchy
  const hierarchyData = useMemo(() => {
    if (!positions || positions.length === 0) return null;

    try {
      const validIds = new Set(positions.map(p => p.id));
      
      // Identify nodes that have no parent or an invalid parentId
      const roots = positions.filter(p => !p.parentId || !validIds.has(p.parentId));
      
      const cleanPositions = positions.map(p => ({
        ...p,
        parentId: p.parentId && validIds.has(p.parentId) ? p.parentId : null
      }));

      let dataToStratify = [...cleanPositions];
      let rootIdToUse = '';

      if (roots.length > 1) {
        // Multiple roots: Inject a virtual root
        rootIdToUse = VIRTUAL_ROOT_ID;
        dataToStratify.push({
          id: VIRTUAL_ROOT_ID,
          title: 'Organization',
          positionNumber: 'ROOT',
          parentId: null,
          occupants: [],
          occupantCount: 0,
          createdAt: new Date().toISOString()
        } as any);

        // Point all real roots to the virtual root
        dataToStratify = dataToStratify.map(p => 
          roots.some(r => r.id === p.id) ? { ...p, parentId: VIRTUAL_ROOT_ID } : p
        );
      } else if (roots.length === 1) {
        rootIdToUse = roots[0].id;
      } else {
        return null; // Should not happen with valid data
      }

      const stratify = d3.stratify<any>()
        .id(d => d.id)
        .parentId(d => d.parentId);

      const root = stratify(dataToStratify);
      
      const treeLayout = d3.tree<any>()
        .nodeSize([VERTICAL_SPACING, HORIZONTAL_SPACING]);
        
      return treeLayout(root) as unknown as TreeNode;
    } catch (err) {
      console.error('Org Chart Stratification Error:', err);
      return null;
    }
  }, [positions]);

  // 3. Zoom / Pan Support
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;
    
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        d3.select(svgRef.current).select('g.transform-layer')
          .attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    
    // Initial centering - adjust based on layout
    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 600 };
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 4, height / 2).scale(0.8));
    
  }, [hierarchyData]);

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-3xl border border-zinc-200 bg-white/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-zinc-500 animate-pulse">Mapping Organization...</span>
        </div>
      </div>
    );
  }

  if (!hierarchyData) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <Briefcase size={48} className="mb-4 text-zinc-300" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No Reporting Structure Found</h3>
        <p className="text-zinc-500 max-w-sm text-center mt-2">
          Create positions and define their reporting lines in the "Positions" tab to see them mapped out here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[700px] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50" ref={containerRef}>
      {/* Search & Controls Overlay */}
      <div className="absolute left-6 top-6 z-10 flex flex-col gap-3">
        <div className="relative group">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search structure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-64 rounded-2xl border border-zinc-200 bg-white/80 pl-10 pr-4 text-sm shadow-xl shadow-zinc-200/20 backdrop-blur-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none"
          />
        </div>
        
        <div className="flex items-center gap-2 p-1 rounded-2xl border border-zinc-200 bg-white/80 shadow-xl shadow-zinc-200/20 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none w-max">
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400" onClick={() => {
            const svg = d3.select(svgRef.current!);
            svg.transition().call(d3.zoom<SVGSVGElement, any>().scaleBy, 1.3);
          }}>
            <ZoomIn size={18} />
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400" onClick={() => {
            const svg = d3.select(svgRef.current!);
            svg.transition().call(d3.zoom<SVGSVGElement, any>().scaleBy, 0.7);
          }}>
            <ZoomOut size={18} />
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400" onClick={() => {
             const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 600 };
             d3.select(svgRef.current!).transition().call(d3.zoom<SVGSVGElement, any>().transform, d3.zoomIdentity.translate(width / 4, height / 2).scale(0.8));
          }}>
            <Maximize size={18} />
          </button>
          <div className="px-3 py-1 font-mono text-xs text-zinc-500">
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg ref={svgRef} className="h-full w-full cursor-grab active:cursor-grabbing">
        <defs>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.1" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <g className="transform-layer">
          {/* Links */}
          {hierarchyData.links()
            .filter(link => link.source.data.id !== VIRTUAL_ROOT_ID)
            .map((link, i) => {
              const start = link.source as TreeNode;
              const end = link.target as TreeNode;
              
              // Cubic Bezier for smooth flow
              const pathData = d3.linkHorizontal<any, TreeNode>()
                .x(d => d.y)
                .y(d => d.x)
                ({ source: start, target: end });

              return (
                <path
                  key={`link-${i}`}
                  d={pathData || ''}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={2}
                  className="transition-all dark:stroke-zinc-800"
                />
              );
            })}

          {/* Nodes */}
          {hierarchyData.descendants()
            .filter(node => node.data.id !== VIRTUAL_ROOT_ID)
            .map((node: any, i) => (
              <g key={`node-${node.data.id}`} transform={`translate(${node.y}, ${node.x})`}>
              <foreignObject 
                x={-NODE_WIDTH / 2} 
                y={-NODE_HEIGHT / 2} 
                width={NODE_WIDTH} 
                height={NODE_HEIGHT}
                className="overflow-visible"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  onClick={() => navigate(`/dashboard/settings/positions/${node.data.id}`)}
                  className={`flex flex-col h-full rounded-2xl border bg-white p-3 shadow-lg transition-all cursor-pointer dark:bg-zinc-900 ${
                    searchQuery && (node.data.title.toLowerCase().includes(searchQuery.toLowerCase()) || node.data.positionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      ? 'border-blue-500 ring-4 ring-blue-500/10' 
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <Badge variant="blue" className="text-[10px] py-0 px-1.5 font-mono">{node.data.positionNumber}</Badge>
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-50 dark:bg-zinc-800/50 pr-2">
                       <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ${
                         node.data.occupants?.[0]?.isSynthetic ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                       }`}>
                         {node.data.occupants?.[0]?.isSynthetic ? <Cpu size={10} /> : <User size={10} />}
                       </div>
                       <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-tighter">
                         {node.data.occupantCount > 0 ? (node.data.occupants?.[0]?.isSynthetic ? 'Agent' : 'Human') : 'Vacant'}
                       </span>
                    </div>
                  </div>
                  
                  <h4 className="mt-2 text-xs font-bold text-zinc-900 line-clamp-1 dark:text-zinc-100 leading-tight">
                    {node.data.title}
                  </h4>

                  {/* Occupant Name Section */}
                  <div className="mt-2 flex flex-col gap-1 flex-1">
                    {node.data.occupantCount > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 truncate">
                          {node.data.occupants?.[0]?.name}
                        </span>
                        {node.data.occupantCount > 1 && (
                          <span className="text-[9px] text-zinc-400 italic">
                            + {node.data.occupantCount - 1} other{node.data.occupantCount > 2 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] italic text-zinc-400">Position Unfilled</span>
                    )}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Users size={10} />
                      {node.data.occupantCount}
                    </div>
                    {node.children && (
                      <div className="flex items-center gap-0.5 text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 rounded-md">
                        {node.children.length} reports
                      </div>
                    )}
                  </div>
                </motion.div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
      
      {/* Legend / Status bar */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-[10px] font-medium text-zinc-600 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Positions</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span>Agents</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
          Total Nodes: {positions.length}
        </div>
      </div>
    </div>
  );
};
