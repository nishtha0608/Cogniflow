import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  FileText,
  FolderOpen,
  AlertTriangle,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Node styling by type ───────────────────────────────────────────────────────

const NODE_STYLES = {
  project:      { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)',  label: 'Project',      icon: '◈' },
  document:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  label: 'Document',     icon: '◻' },
  gap:          { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  label: 'Gap',          icon: '◇' },
  conversation: { color: '#10b981', glow: 'rgba(16,185,129,0.5)', label: 'Conversation', icon: '○' },
};

// ── Demo data when user has no entities yet ────────────────────────────────────

const DEMO_NODES = [
  { id: 'p_demo', type: 'project',      label: 'Your Research Project', size: 20 },
  { id: 'd_1',    type: 'document',     label: 'Literature Review',    size: 12, project_id: 'p_demo' },
  { id: 'd_2',    type: 'document',     label: 'Methodology Draft',    size: 12, project_id: 'p_demo' },
  { id: 'd_3',    type: 'document',     label: 'Key Reference Paper',  size: 10, project_id: 'p_demo' },
  { id: 'g_1',    type: 'gap',          label: 'Empirical Gap',        size: 14, project_id: 'p_demo', significance: 'critical' },
  { id: 'g_2',    type: 'gap',          label: 'Methodological Gap',   size: 12, project_id: 'p_demo', significance: 'high' },
  { id: 'c_1',    type: 'conversation', label: 'Research Chat #1',     size: 9,  project_id: 'p_demo' },
  { id: 'c_2',    type: 'conversation', label: 'Literature Discussion', size: 9, project_id: 'p_demo' },
];

const DEMO_EDGES = [
  { source: 'p_demo', target: 'd_1' },
  { source: 'p_demo', target: 'd_2' },
  { source: 'p_demo', target: 'd_3' },
  { source: 'p_demo', target: 'g_1' },
  { source: 'p_demo', target: 'g_2' },
  { source: 'p_demo', target: 'c_1' },
  { source: 'p_demo', target: 'c_2' },
  { source: 'd_1',    target: 'g_1' },
  { source: 'd_2',    target: 'g_2' },
  { source: 'c_1',    target: 'd_1' },
];

// ── Physics constants ──────────────────────────────────────────────────────────

const REPULSION   = 4200;
const ATTRACTION  = 0.012;
const REST_LENGTH = 140;
const DAMPING     = 0.82;
const CENTER_PULL = 0.025;

// ── Canvas renderer ────────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({ nodes: [], edges: [], zoom: 1, pan: { x: 0, y: 0 }, dragging: null, hover: null });
  const [graphLoaded, setGraphLoaded]   = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoomState]            = useState(1);
  const [filter, setFilter]             = useState('all');
  const [isDemo, setIsDemo]             = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async () => {
    try {
      const data = await cogniflow.ai.graphData();
      let nodes = data.nodes || [];
      let edges = data.edges || [];

      if (nodes.length === 0) {
        nodes = DEMO_NODES;
        edges = DEMO_EDGES;
        setIsDemo(true);
      } else {
        setIsDemo(false);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Assign random initial positions in a circle
      const physNodes = nodes.map((n, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        const r = 180 + Math.random() * 80;
        return {
          ...n,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2, // for pulse animation
        };
      });

      stateRef.current.nodes = physNodes;
      stateRef.current.edges = edges;
      setGraphLoaded(true);
    } catch (e) {
      stateRef.current.nodes = DEMO_NODES.map((n, i) => {
        const angle = (i / DEMO_NODES.length) * Math.PI * 2;
        return { ...n, x: 400 + Math.cos(angle) * 180, y: 300 + Math.sin(angle) * 180, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 };
      });
      stateRef.current.edges = DEMO_EDGES;
      setIsDemo(true);
      setGraphLoaded(true);
    }
  }, []);

  // ── Physics tick ─────────────────────────────────────────────────────────────

  const tick = useCallback((t) => {
    const s = stateRef.current;
    const { nodes, edges } = s;
    if (!nodes.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Apply forces (skip if dragging a node)
    for (let i = 0; i < nodes.length; i++) {
      if (s.dragging === nodes[i].id) continue;

      let fx = 0, fy = 0;

      // Repulsion between all pairs
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist2 = dx * dx + dy * dy || 1;
        const dist  = Math.sqrt(dist2);
        const force = REPULSION / dist2;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      // Attraction along edges
      for (const edge of edges) {
        const isSrc = edge.source === nodes[i].id;
        const isTgt = edge.target === nodes[i].id;
        if (!isSrc && !isTgt) continue;
        const other = nodes.find((n) => n.id === (isSrc ? edge.target : edge.source));
        if (!other) continue;
        const dx = other.x - nodes[i].x;
        const dy = other.y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const stretch = dist - REST_LENGTH;
        fx += dx / dist * stretch * ATTRACTION;
        fy += dy / dist * stretch * ATTRACTION;
      }

      // Center gravity
      fx += (cx - nodes[i].x) * CENTER_PULL;
      fy += (cy - nodes[i].y) * CENTER_PULL;

      nodes[i].vx = (nodes[i].vx + fx * 0.1) * DAMPING;
      nodes[i].vy = (nodes[i].vy + fy * 0.1) * DAMPING;
      nodes[i].x  += nodes[i].vx;
      nodes[i].y  += nodes[i].vy;
    }

    // ── Draw ──────────────────────────────────────────────────────────────────

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(s.pan.x, s.pan.y);
    ctx.scale(s.zoom, s.zoom);

    const visibleNodes = filter === 'all'
      ? nodes
      : nodes.filter((n) => n.type === filter);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    // Draw edges
    for (const edge of edges) {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const isHighlighted =
        selectedNode &&
        (selectedNode.id === edge.source || selectedNode.id === edge.target);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isHighlighted
        ? 'rgba(139,92,246,0.6)'
        : 'rgba(100,116,139,0.2)';
      ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Draw nodes
    const pulse = (Math.sin(t * 0.002) + 1) / 2; // 0→1 oscillation

    for (const node of visibleNodes) {
      const style   = NODE_STYLES[node.type] || NODE_STYLES.document;
      const r       = (node.size || 10);
      const isHover = s.hover === node.id;
      const isSel   = selectedNode?.id === node.id;
      const nodePulse = (Math.sin(t * 0.002 + node.phase) + 1) / 2;

      // Glow
      const glowR = r + 8 + nodePulse * 6;
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
      grad.addColorStop(0, style.glow);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + (isHover || isSel ? 3 : 0), 0, Math.PI * 2);
      ctx.fillStyle = style.color;
      ctx.shadowColor = style.glow;
      ctx.shadowBlur  = isSel ? 24 : isHover ? 16 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border for selected
      if (isSel) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      if (isHover || isSel || node.type === 'project') {
        ctx.font = `${node.type === 'project' ? '600 ' : ''}${node.type === 'project' ? 13 : 11}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(
          node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label,
          node.x,
          node.y + r + 16,
        );
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(tick);
  }, [filter, selectedNode]);

  // ── Mount / resize ────────────────────────────────────────────────────────────

  useEffect(() => {
    loadGraph();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [loadGraph]);

  useEffect(() => {
    if (!graphLoaded) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [graphLoaded, tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Mouse interactions ────────────────────────────────────────────────────────

  const getNodeAt = useCallback((ex, ey) => {
    const s = stateRef.current;
    const x = (ex - s.pan.x) / s.zoom;
    const y = (ey - s.pan.y) / s.zoom;
    for (const node of s.nodes) {
      const dx = node.x - x, dy = node.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= (node.size || 10) + 6) return node;
    }
    return null;
  }, []);

  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const s = stateRef.current;

    if (s.dragging) {
      const node = s.nodes.find((n) => n.id === s.dragging);
      if (node) {
        node.x = (ex - s.pan.x) / s.zoom;
        node.y = (ey - s.pan.y) / s.zoom;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }
    if (s.panning) {
      s.pan.x += e.movementX;
      s.pan.y += e.movementY;
      return;
    }

    const hit = getNodeAt(ex, ey);
    s.hover = hit ? hit.id : null;
    canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
  }, [getNodeAt]);

  const onMouseDown = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const hit = getNodeAt(ex, ey);
    const s = stateRef.current;

    if (hit) {
      s.dragging = hit.id;
      canvasRef.current.style.cursor = 'grabbing';
    } else {
      s.panning = true;
    }
  }, [getNodeAt]);

  const onMouseUp = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const s = stateRef.current;

    if (s.dragging) {
      const hit = getNodeAt(ex, ey);
      if (hit) setSelectedNode(hit);
      s.dragging = null;
    }
    if (s.panning) s.panning = false;
  }, [getNodeAt]);

  const onClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const hit = getNodeAt(ex, ey);
    setSelectedNode(hit || null);
  }, [getNodeAt]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    s.zoom = Math.max(0.3, Math.min(3, s.zoom * factor));
    setZoomState(s.zoom);
  }, []);

  const handleZoom = (dir) => {
    const s = stateRef.current;
    s.zoom = Math.max(0.3, Math.min(3, s.zoom * (dir > 0 ? 1.2 : 0.8)));
    setZoomState(s.zoom);
  };

  const handleReset = () => {
    stateRef.current.pan  = { x: 0, y: 0 };
    stateRef.current.zoom = 1;
    setZoomState(1);
  };

  const counts = stateRef.current.nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700">
            <Network size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Knowledge Constellation</h1>
            <p className="text-xs text-slate-500">
              {stateRef.current.nodes.length} nodes · {stateRef.current.edges.length} connections
              {isDemo && <span className="ml-2 text-amber-500/70">(demo — add content to see your graph)</span>}
            </p>
          </div>
        </div>

        {/* Legend + Filter */}
        <div className="flex items-center gap-2">
          {Object.entries(NODE_STYLES).map(([type, style]) => (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                filter === type || filter === 'all'
                  ? 'opacity-100'
                  : 'opacity-30',
                'border-slate-700 bg-slate-800/50 hover:bg-slate-800',
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: style.color }}
              />
              <span className="text-slate-300 capitalize">{style.label}</span>
              {counts[type] ? (
                <span className="text-slate-500">({counts[type]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleZoom(1)}>
            <ZoomIn size={14} className="text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleZoom(-1)}>
            <ZoomOut size={14} className="text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleReset}>
            <Maximize2 size={14} className="text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={loadGraph}>
            <RefreshCw size={14} className="text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onClick={onClick}
          onWheel={onWheel}
          style={{ cursor: 'grab' }}
        />

        {/* Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-72 rounded-2xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: NODE_STYLES[selectedNode.type]?.color }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge
                      className="text-xs mb-2 capitalize"
                      style={{
                        backgroundColor: NODE_STYLES[selectedNode.type]?.color + '25',
                        color: NODE_STYLES[selectedNode.type]?.color,
                        borderColor: NODE_STYLES[selectedNode.type]?.color + '40',
                      }}
                    >
                      {NODE_STYLES[selectedNode.type]?.label}
                    </Badge>
                    <h3 className="font-semibold text-white text-sm leading-tight">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Node ID</span>
                    <span className="font-mono">{selectedNode.id}</span>
                  </div>
                  {selectedNode.significance && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Significance</span>
                      <span className="capitalize text-amber-400">{selectedNode.significance}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Connections</span>
                    <span>
                      {stateRef.current.edges.filter(
                        (e) => e.source === selectedNode.id || e.target === selectedNode.id,
                      ).length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        {graphLoaded && !selectedNode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-500 pointer-events-none">
            <Info size={12} />
            Click a node to inspect · Drag to reposition · Scroll to zoom · Drag canvas to pan
          </div>
        )}
      </div>
    </div>
  );
}
