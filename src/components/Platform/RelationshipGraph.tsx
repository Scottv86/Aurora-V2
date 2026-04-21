import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { usePlatform } from '../../hooks/usePlatform';
import { Building2, User, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';

export const RelationshipGraph = ({ rootId, rootName, rootType }: { rootId?: string, rootName?: string, rootType?: string }) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphData();
    
    const observer = new ResizeObserver(() => {
      if (partyData.nodes.length > 0) {
        renderGraph(partyData.nodes, partyData.links);
      }
    });
    
    if (svgRef.current) observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [rootId]);

  const [partyData, setPartyData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      
      if (!rootId) {
        // Mocking for global view if no rootId (or could fetch all)
        const mockNodes = [
          { id: '1', name: 'Aurora Corp', type: 'ORGANIZATION', group: 1 },
          { id: '2', name: 'John Doe', type: 'PERSON', group: 2 },
          { id: '3', name: 'Jane Smith', type: 'PERSON', group: 2 },
          { id: '4', name: 'Tech Solutions Ltd', type: 'ORGANIZATION', group: 1 },
          { id: '5', name: 'Global Finance', type: 'ORGANIZATION', group: 3 },
        ];
        
        const mockLinks = [
          { source: '1', target: '2', type: 'EMPLOYEE' },
          { source: '1', target: '3', type: 'EMPLOYEE' },
          { source: '4', target: '1', type: 'PARTNER' },
          { source: '1', target: '5', type: 'SUBSIDIARY' },
        ];
        renderGraph(mockNodes, mockLinks);
        return;
      }

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${rootId}/relationships`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const relationships = await res.json();
      
      if (!res.ok) throw new Error('Failed to fetch relationships');

      // Transform relationships to nodes/links
      const nodes: any[] = [{ id: rootId, name: rootName || 'Root', type: rootType || 'PERSON' }];
      const links: any[] = [];
      const seenIds = new Set([rootId]);

      relationships.forEach((rel: any) => {
        const sourceId = rel.sourcePartyId;
        const targetId = rel.targetPartyId;
        const otherParty = sourceId === rootId ? rel.targetParty : rel.sourceParty;
        
        if (!seenIds.has(otherParty.id)) {
          nodes.push({
            id: otherParty.id,
            name: otherParty.partyType === 'PERSON' 
              ? `${otherParty.person?.firstName} ${otherParty.person?.lastName}`
              : otherParty.organization?.legalName,
            type: otherParty.partyType
          });
          seenIds.add(otherParty.id);
        }

        links.push({
          source: sourceId,
          target: targetId,
          type: rel.relationshipType
        });
      });

      setPartyData({ nodes, links });
      renderGraph(nodes, links);
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = (nodes: any[], links: any[]) => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Outer circle
    node.append('circle')
      .attr('r', 24)
      .attr('fill', (d: any) => d.type === 'ORGANIZATION' ? '#4f46e5' : '#f59e0b')
      .attr('fill-opacity', 0.1)
      .attr('stroke', (d: any) => d.type === 'ORGANIZATION' ? '#4f46e5' : '#f59e0b')
      .attr('stroke-width', 1);

    // Inner icon background
    node.append('circle')
      .attr('r', 18)
      .attr('fill', '#ffffff');

    // Label
    node.append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.name)
      .attr('class', 'text-[10px] font-bold fill-zinc-600 dark:fill-zinc-300');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm relative">
      <div className="absolute top-6 left-6 z-10 space-y-2">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Relationship Mapping</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-zinc-500 font-medium">Organization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-zinc-500 font-medium">Individual</span>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <GraphControl icon={<ZoomIn size={18} />} />
        <GraphControl icon={<ZoomOut size={18} />} />
        <GraphControl icon={<Maximize2 size={18} />} />
      </div>

      {loading ? (
        <div className="h-[600px] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Synthesizing neural relationship map...</p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-[600px] cursor-move" />
      )}
      
      <div className="absolute bottom-6 left-6 right-6 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl backdrop-blur-md">
        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium text-center">
          Interactive Relationship Tree: Drag nodes to explore connections. Red lines indicate direct ownership, grey lines represent operational relations.
        </p>
      </div>
    </div>
  );
};

const GraphControl = ({ icon }: { icon: React.ReactNode }) => (
  <button className="p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-indigo-500 transition-all shadow-sm">
    {icon}
  </button>
);
