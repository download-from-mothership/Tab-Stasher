'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GraphNode {
  id: string;
  title: string;
  url: string;
  primary_category: string;
  favicon: string | null;
  cluster_id: string | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source_tab_id: string;
  target_tab_id: string;
  link_type: string;
  strength: number;
}

interface Cluster {
  id: string;
  label: string;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  technology: '#3b82f6',
  business: '#8b5cf6',
  education: '#10b981',
  entertainment: '#f59e0b',
  news: '#ef4444',
  shopping: '#ec4899',
  social: '#06b6d4',
  finance: '#84cc16',
  health: '#14b8a6',
  travel: '#f97316',
  food: '#a855f7',
  sports: '#6366f1',
  uncategorized: '#9ca3af',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS.uncategorized;
}

export function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoLinking, setAutoLinking] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [stats, setStats] = useState({ totalNodes: 0, totalEdges: 0 });
  const [filterCategory, setFilterCategory] = useState<string>('');
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const dragRef = useRef<{ node: GraphNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });

  const fetchGraph = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);

      const response = await fetch(`/api/tabs/graph?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch graph');

      const data = await response.json();

      // Initialize positions in a circle layout
      const graphNodes = data.nodes.map((n: GraphNode, i: number) => {
        const angle = (2 * Math.PI * i) / data.nodes.length;
        const radius = Math.min(300, data.nodes.length * 3);
        return {
          ...n,
          x: n.graph_x || 400 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: n.graph_y || 300 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        };
      });

      setNodes(graphNodes);
      nodesRef.current = graphNodes;
      setEdges(data.edges);
      setClusters(data.clusters);
      setStats({ totalNodes: data.totalNodes, totalEdges: data.totalEdges });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching graph:', error);
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const nodeMap = new Map<string, GraphNode>();
    nodesRef.current.forEach(n => nodeMap.set(n.id, n));

    let iterations = 0;
    const maxIterations = 200;

    const simulate = () => {
      if (iterations >= maxIterations) return;
      iterations++;

      const currentNodes = nodesRef.current;
      const alpha = 1 - iterations / maxIterations;

      // Repulsion between all nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          const dx = (b.x || 0) - (a.x || 0);
          const dy = (b.y || 0) - (a.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (200 * alpha) / (dist * dist);

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          a.vx = (a.vx || 0) - fx;
          a.vy = (a.vy || 0) - fy;
          b.vx = (b.vx || 0) + fx;
          b.vy = (b.vy || 0) + fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source_tab_id);
        const b = nodeMap.get(edge.target_tab_id);
        if (!a || !b) continue;

        const dx = (b.x || 0) - (a.x || 0);
        const dy = (b.y || 0) - (a.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.01 * edge.strength * alpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx = (a.vx || 0) + fx;
        a.vy = (a.vy || 0) + fy;
        b.vx = (b.vx || 0) - fx;
        b.vy = (b.vy || 0) - fy;
      }

      // Center gravity
      for (const node of currentNodes) {
        const dx = 400 - (node.x || 0);
        const dy = 300 - (node.y || 0);
        node.vx = (node.vx || 0) + dx * 0.001 * alpha;
        node.vy = (node.vy || 0) + dy * 0.001 * alpha;
      }

      // Apply velocities with damping
      for (const node of currentNodes) {
        if (dragRef.current.node === node) continue;
        node.vx = (node.vx || 0) * 0.9;
        node.vy = (node.vy || 0) * 0.9;
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);

        // Keep in bounds
        node.x = Math.max(20, Math.min(780, node.x));
        node.y = Math.max(20, Math.min(580, node.y));
      }

      nodesRef.current = [...currentNodes];
      setNodes([...currentNodes]);

      if (alpha > 0.01) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [edges, nodes.length]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    for (const edge of edges) {
      const source = nodesRef.current.find(n => n.id === edge.source_tab_id);
      const target = nodesRef.current.find(n => n.id === edge.target_tab_id);
      if (!source || !target) continue;

      const isHighlighted = selectedNode &&
        (source.id === selectedNode.id || target.id === selectedNode.id);

      ctx.beginPath();
      ctx.moveTo(source.x || 0, source.y || 0);
      ctx.lineTo(target.x || 0, target.y || 0);
      ctx.strokeStyle = isHighlighted ? '#3b82f6' : `rgba(156, 163, 175, ${edge.strength * 0.5})`;
      ctx.lineWidth = isHighlighted ? 2 : Math.max(0.5, edge.strength * 2);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodesRef.current) {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isConnected = selectedNode && edges.some(e =>
        (e.source_tab_id === selectedNode.id && e.target_tab_id === node.id) ||
        (e.target_tab_id === selectedNode.id && e.source_tab_id === node.id)
      );
      const radius = isSelected ? 8 : isHovered ? 7 : isConnected ? 6 : 5;

      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = getCategoryColor(node.primary_category);

      if (!isSelected && !isConnected && selectedNode) {
        ctx.globalAlpha = 0.2;
      }

      ctx.fill();
      ctx.globalAlpha = 1;

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw label for hovered/selected node
    const labelNode = hoveredNode || selectedNode;
    if (labelNode) {
      const title = labelNode.title?.substring(0, 40) || 'Untitled';
      ctx.font = '12px -apple-system, sans-serif';
      const textWidth = ctx.measureText(title).width;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(
        (labelNode.x || 0) - textWidth / 2 - 4,
        (labelNode.y || 0) - 22,
        textWidth + 8,
        18
      );

      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText(title, labelNode.x || 0, (labelNode.y || 0) - 8);
    }
  }, [nodes, edges, selectedNode, hoveredNode]);

  // Mouse interaction
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Drag
    if (dragRef.current.node) {
      dragRef.current.node.x = x - dragRef.current.offsetX;
      dragRef.current.node.y = y - dragRef.current.offsetY;
      setNodes([...nodesRef.current]);
      return;
    }

    // Hover detection
    let found: GraphNode | null = null;
    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - x;
      const dy = (node.y || 0) - y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        found = node;
        break;
      }
    }

    setHoveredNode(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - x;
      const dy = (node.y || 0) - y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        dragRef.current = { node, offsetX: x - (node.x || 0), offsetY: y - (node.y || 0) };
        setSelectedNode(node);
        return;
      }
    }
    setSelectedNode(null);
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
  }, []);

  const handleAutoLink = async () => {
    setAutoLinking(true);
    try {
      const response = await fetch('/api/tabs/graph', { method: 'POST' });
      const data = await response.json();
      if (data.linksCreated > 0) {
        await fetchGraph();
      }
    } catch (error) {
      console.error('Auto-link error:', error);
    }
    setAutoLinking(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading knowledge graph...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>Knowledge Graph</h2>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {stats.totalNodes} tabs &middot; {stats.totalEdges} connections
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              background: '#fff'
            }}
          >
            <option value="">All Categories</option>
            {clusters.map(c => (
              <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
            ))}
          </select>
          <button
            onClick={handleAutoLink}
            disabled={autoLinking}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: autoLinking ? '#f3f4f6' : '#8b5cf6',
              color: autoLinking ? '#6b7280' : '#fff',
              fontSize: '13px',
              cursor: autoLinking ? 'not-allowed' : 'pointer'
            }}
          >
            {autoLinking ? 'Linking...' : 'Auto-Link'}
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#fafafa'
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ width: '100%', height: 'auto', maxHeight: '600px' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '12px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        {clusters.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: getCategoryColor(c.id),
              display: 'inline-block'
            }} />
            <span style={{ color: '#374151' }}>{c.label}</span>
            <span style={{ color: '#9ca3af' }}>({c.count})</span>
          </div>
        ))}
      </div>

      {/* Selected node details */}
      {selectedNode && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            {selectedNode.title}
          </h3>
          <a
            href={selectedNode.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#3b82f6', wordBreak: 'break-all' }}
          >
            {selectedNode.url}
          </a>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              background: getCategoryColor(selectedNode.primary_category) + '20',
              color: getCategoryColor(selectedNode.primary_category),
              fontWeight: 500
            }}>
              {selectedNode.primary_category}
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {edges.filter(e =>
                e.source_tab_id === selectedNode.id || e.target_tab_id === selectedNode.id
              ).length} connections
            </span>
          </div>
        </div>
      )}

      {nodes.length === 0 && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No tabs to visualize</p>
          <p style={{ fontSize: '13px' }}>Save some tabs and click "Auto-Link" to build your knowledge graph.</p>
        </div>
      )}
    </div>
  );
}
