import { memo, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position as HandlePos, MarkerType, ReactFlowProvider,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { motion } from 'framer-motion';
import { cx } from '../components/ui';

export interface GNode { id: string; label: string; sub?: string; colour: string; badge?: string; badgeColour?: string }
export interface GEdge { from: string; to: string; colour?: string; dashed?: boolean; label?: string; animated?: boolean }

const NODE_W = 210;
const NODE_H = 66;
type D = { n: GNode; selected: boolean; dim: boolean; i: number; dir: 'LR' | 'TB' };

const Box = memo(function Box({ data }: NodeProps<Node<D>>) {
  const { n, selected, dim, i, dir } = data;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 8 }}
      animate={{ opacity: dim ? 0.3 : 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(i, 40) * 0.035, type: 'spring', stiffness: 240, damping: 20 }}
      className={cx('rounded-xl border bg-surface px-3 py-2 shadow-sm transition-shadow', selected ? 'shadow-[0_0_0_3px_var(--accent)]' : 'hover:shadow-lg')}
      style={{ width: NODE_W, minHeight: NODE_H, borderColor: n.colour, borderLeftWidth: 5 }}
    >
      <Handle type="target" position={dir === 'LR' ? HandlePos.Left : HandlePos.Top} className="!h-2 !w-2 !border-0" style={{ background: n.colour }} />
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: n.colour }}>
        <span className="truncate">{n.sub}</span>
        {n.badge && <span className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[9px] text-white" style={{ background: n.badgeColour ?? n.colour }}>{n.badge}</span>}
      </div>
      <div className="text-[13px] font-semibold leading-snug text-ink">{n.label}</div>
      <Handle type="source" position={dir === 'LR' ? HandlePos.Right : HandlePos.Bottom} className="!h-2 !w-2 !border-0" style={{ background: n.colour }} />
    </motion.div>
  );
});
const nodeTypes = { box: Box };

function Inner({ nodes, edges, selected, onSelect, dir, height }: { nodes: GNode[]; edges: GEdge[]; selected?: string; onSelect?: (id: string) => void; dir: 'LR' | 'TB'; height: number }) {
  const { rfNodes, rfEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: dir, nodesep: 26, ranksep: dir === 'LR' ? 80 : 60, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
    const es = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
    for (const e of es) g.setEdge(e.from, e.to);
    dagre.layout(g);
    const near = new Set<string>();
    if (selected) { near.add(selected); for (const e of es) { if (e.from === selected) near.add(e.to); if (e.to === selected) near.add(e.from); } }
    const rfNodes: Node<D>[] = nodes.map((n, i) => {
      const p = g.node(n.id);
      return { id: n.id, type: 'box', position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, data: { n, selected: n.id === selected, dim: !!selected && !near.has(n.id), i, dir } };
    });
    const rfEdges: Edge[] = es.map((e, i) => {
      const on = !selected || e.from === selected || e.to === selected;
      const c = e.colour ?? 'var(--muted)';
      return {
        id: `e${i}`, source: e.from, target: e.to, label: on ? e.label : undefined, animated: e.animated ?? on,
        style: { stroke: c, strokeWidth: on ? 2 : 1, opacity: on ? 0.9 : 0.15, strokeDasharray: e.dashed ? '5 4' : undefined },
        labelStyle: { fontSize: 10, fill: c, fontWeight: 700 }, labelBgStyle: { fill: 'var(--surface)' },
        markerEnd: { type: MarkerType.ArrowClosed, color: c, width: 14, height: 14 },
      };
    });
    return { rfNodes, rfEdges };
  }, [nodes, edges, selected, dir]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-2" style={{ height }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="var(--line)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={(n) => (n.data as D).n.colour} className="!hidden sm:!block" />
      </ReactFlow>
    </div>
  );
}

/** Animated, auto-laid-out flowchart (dagre) of arbitrary nodes and edges. */
export function GraphFlow(props: { nodes: GNode[]; edges: GEdge[]; selected?: string; onSelect?: (id: string) => void; dir?: 'LR' | 'TB'; height?: number }) {
  return (
    <ReactFlowProvider>
      <Inner {...props} dir={props.dir ?? 'LR'} height={props.height ?? 560} />
    </ReactFlowProvider>
  );
}
