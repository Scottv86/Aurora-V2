import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../../hooks/usePlatform';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { usePartyProfileCard } from '../../context/PartyProfileCardContext';

export const RelationshipGraph = ({
  rootId,
  rootName,
  rootType,
}: {
  rootId?: string;
  rootName?: string;
  rootType?: string;
}) => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const { openPartyCard } = usePartyProfileCard();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [partyData, setPartyData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    fetchGraphData();

    const observer = new ResizeObserver(() => {
      if (partyData.nodes.length > 0) {
        renderGraph(partyData.nodes, partyData.links);
      }
    });

    if (svgRef.current) observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [rootId, rootName, rootType]);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

      if (!rootId) {
        const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenant?.id || '',
          },
        });
        const data = await res.json();
        const parties = Array.isArray(data) ? data : data.parties || [];
        const nodes = parties.slice(0, 25).map((p: any) => ({
          id: p.id,
          name:
            p.displayName ||
            (p.partyType === 'PERSON'
              ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
              : p.organization?.legalName || 'Entity'),
          type: p.partyType,
          subtitle:
            p.partyType === 'PERSON'
              ? p.person?.jobTitle || ''
              : p.organization?.industry || p.organization?.orgStructureType || '',
          isRoot: false,
        }));
        const nodeSet = new Set(nodes.map((n: any) => n.id));
        const links: any[] = [];
        for (const p of parties.slice(0, 25)) {
          if (p.person?.primaryOrgPartyId && nodeSet.has(p.person.primaryOrgPartyId)) {
            links.push({
              source: p.id,
              target: p.person.primaryOrgPartyId,
              type: p.person.jobTitle || 'EMPLOYEE',
              ownership: null,
            });
          }
        }
        setPartyData({ nodes, links });
        renderGraph(nodes, links);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${rootId}/relationships`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '',
        },
      });
      const relationships = await res.json();
      if (!res.ok) throw new Error('Failed to fetch relationships');

      const nodes: any[] = [
        {
          id: rootId,
          name: rootName || 'Focal Entity',
          type: rootType || 'ORGANIZATION',
          subtitle: 'Focal Entity',
          isRoot: true,
        },
      ];
      const links: any[] = [];
      const seenIds = new Set([rootId]);

      (Array.isArray(relationships) ? relationships : []).forEach((rel: any) => {
        const sourceId = rel.sourcePartyId;
        const targetId = rel.targetPartyId;
        const otherParty = sourceId === rootId ? rel.targetParty : rel.sourceParty;
        if (!otherParty) return;

        if (!seenIds.has(otherParty.id)) {
          const otherName =
            otherParty.displayName ||
            (otherParty.partyType === 'PERSON'
              ? `${otherParty.person?.firstName || ''} ${otherParty.person?.lastName || ''}`.trim()
              : otherParty.organization?.legalName || 'Related Entity');
          nodes.push({
            id: otherParty.id,
            name: otherName,
            type: otherParty.partyType,
            subtitle:
              rel.roleTitle ||
              (otherParty.partyType === 'PERSON'
                ? otherParty.person?.jobTitle
                : otherParty.organization?.industry) ||
              rel.relationshipType,
            isRoot: false,
            isPrimary: Boolean(rel.isPrimary),
            ownershipPercentage: rel.ownershipPercentage,
          });
          seenIds.add(otherParty.id);
        }

        const edgeLabel = rel.ownershipPercentage
          ? `${rel.roleTitle || rel.relationshipType} (${rel.ownershipPercentage}%)`
          : rel.roleTitle || rel.relationshipType;

        links.push({
          source: sourceId,
          target: targetId,
          type: rel.relationshipType,
          label: edgeLabel,
          ownershipPercentage: rel.ownershipPercentage,
          isPrimary: Boolean(rel.isPrimary),
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

  const renderGraph = (rawNodes: any[], rawLinks: any[]) => {
    if (!svgRef.current) return;

    const nodes = rawNodes.map((n) => ({ ...n }));
    const links = rawLinks.map((l) => ({ ...l }));

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 520;

    const svg = d3.select(svgRef.current).attr('viewBox', [0, 0, width, height]);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3
      .zoom()
      .scaleExtent([0.35, 3])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);
    zoomBehaviorRef.current = { svg, zoom };

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(175)
      )
      .force('charge', d3.forceManyBody().strength(-900))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(65));

    // Link lines
    const linkGroup = g.append('g').selectAll('g').data(links).join('g');

    const linkLine = linkGroup
      .append('line')
      .attr('stroke', (d: any) =>
        d.ownershipPercentage && d.ownershipPercentage >= 25
          ? '#f43f5e'
          : d.isPrimary
          ? '#6366f1'
          : '#94a3b8'
      )
      .attr('stroke-opacity', 0.65)
      .attr('stroke-width', (d: any) => (d.ownershipPercentage || d.isPrimary ? 2.5 : 1.75))
      .attr('stroke-dasharray', (d: any) => (d.type === 'CONTRACTOR' ? '4 4' : null));

    const linkLabel = linkGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -6)
      .text((d: any) => d.label || d.type)
      .attr('class', 'text-[9px] font-bold fill-zinc-500 dark:fill-zinc-400 pointer-events-none');

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      )
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        if (d.id && event.currentTarget) {
          const rect = (event.currentTarget as Element).getBoundingClientRect();
          openPartyCard(d.id, rect);
        }
      })
      .on('dblclick', (event: any, d: any) => {
        event.stopPropagation();
        if (d.id) {
          navigate(`/workspace/apps/directory/${d.id}`);
        }
      });

    // Outer halo
    node
      .append('circle')
      .attr('r', (d: any) => (d.isRoot ? 32 : 26))
      .attr('fill', (d: any) => (d.type === 'ORGANIZATION' ? '#4f46e5' : '#f59e0b'))
      .attr('fill-opacity', (d: any) => (d.isRoot ? 0.22 : 0.12))
      .attr('stroke', (d: any) =>
        d.ownershipPercentage >= 25
          ? '#f43f5e'
          : d.type === 'ORGANIZATION'
          ? '#4f46e5'
          : '#f59e0b'
      )
      .attr('stroke-width', (d: any) => (d.isRoot ? 2.5 : 1.5));

    // Inner circle
    node
      .append('circle')
      .attr('r', (d: any) => (d.isRoot ? 22 : 18))
      .attr('fill', (d: any) => (d.type === 'ORGANIZATION' ? '#eef2ff' : '#fffbeb'));

    // Node Initials
    node
      .append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .text((d: any) =>
        String(d.name || 'E')
          .split(' ')
          .map((p: string) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      )
      .attr('fill', (d: any) => (d.type === 'ORGANIZATION' ? '#4338ca' : '#b45309'))
      .attr('class', 'text-[10px] font-black pointer-events-none');

    // Name label
    node
      .append('text')
      .attr('dy', (d: any) => (d.isRoot ? 46 : 40))
      .attr('text-anchor', 'middle')
      .text((d: any) => d.name)
      .attr('class', 'text-[11px] font-bold fill-zinc-800 dark:fill-zinc-200 pointer-events-none');

    // Subtitle label
    node
      .append('text')
      .attr('dy', (d: any) => (d.isRoot ? 59 : 53))
      .attr('text-anchor', 'middle')
      .text((d: any) => d.subtitle || '')
      .attr('class', 'text-[9px] font-medium fill-zinc-400 pointer-events-none');

    simulation.on('tick', () => {
      linkLine
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
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

  const handleZoom = (factor: number) => {
    if (!zoomBehaviorRef.current) return;
    const { svg, zoom } = zoomBehaviorRef.current;
    svg.transition().duration(250).call(zoom.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!zoomBehaviorRef.current) return;
    const { svg, zoom } = zoomBehaviorRef.current;
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm relative h-full min-h-[480px]">
      <div className="absolute top-5 left-5 z-10 space-y-1.5 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-4 py-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
          Entity Relationship & Ownership Graph
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-zinc-500 font-medium">Organisation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-zinc-500 font-medium">Person</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-zinc-500 font-medium">UBO (&ge;25% Equity)</span>
          </div>
        </div>
      </div>

      <div className="absolute top-5 right-5 z-10 flex flex-col gap-1.5">
        <GraphControl onClick={() => handleZoom(1.25)} title="Zoom In" icon={<ZoomIn size={16} />} />
        <GraphControl onClick={() => handleZoom(0.8)} title="Zoom Out" icon={<ZoomOut size={16} />} />
        <GraphControl onClick={handleResetZoom} title="Reset View" icon={<Maximize2 size={16} />} />
        <GraphControl onClick={fetchGraphData} title="Refresh Graph" icon={<RefreshCw size={16} />} />
      </div>

      {loading ? (
        <div className="h-[520px] flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500">
            Synthesizing entity relationship graph...
          </p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-[520px] cursor-grab active:cursor-grabbing" />
      )}

      <div className="absolute bottom-4 left-5 right-5 px-4 py-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl backdrop-blur-md">
        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium text-center">
          Click any node to inspect its Profile Card • Double-click to open Directory Profile • Drag to rearrange
        </p>
      </div>
    </div>
  );
};

const GraphControl = ({
  icon,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-indigo-500 transition-all shadow-sm"
  >
    {icon}
  </button>
);
