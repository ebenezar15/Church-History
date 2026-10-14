import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position as HandlePos,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { motion, useReducedMotion } from 'framer-motion';
import type { Doctrine, FlowNode } from '../data/schema';
import { EDGE_META, FLOW_KIND_META, formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { cx } from '../components/ui';

const NODE_W = 220;
const NODE_H = 74;

type FlowData = { node: FlowNode; selected: boolean; fresh: boolean; dimmed: boolean };

const KindNode = memo(function KindNode({ data }: NodeProps<Node<FlowData>>) {
  const { node, selected, fresh, dimmed } = data;
  const m = FLOW_KIND_META[node.kind];
  return (
    <motion.div
      initial={fresh ? { opacity: 0, scale: 0.6, y: -10 } : false}
      animate={{ opacity: dimmed ? 0.35 : 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={cx(
        'rounded-xl border bg-surface px-3 py-2 shadow-sm transition-shadow',
        selected ? 'shadow-[0_0_0_3px_var(--accent),0_10px_30px_-10px_rgb(var(--glow)/0.8)]' : 'hover:shadow-lg',
        node.kind === 'question' && 'border-2',
      )}
      style={{ width: NODE_W, minHeight: NODE_H, borderColor: m.colour, borderLeftWidth: 5 }}
    >
      <Handle type="target" position={HandlePos.Top} className="!h-2 !w-2 !border-0" style={{ background: m.colour }} />
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: m.colour }}>
        <Icon name={m.icon} size={12} /> {m.label}
        {node.year !== undefined && <span className="ml-auto tabular-nums text-muted">{formatYear(node.year)}</span>}
      </div>
      <div className="text-[13px] font-semibold leading-snug text-ink">{node.label}</div>
      <Handle type="source" position={HandlePos.Bottom} className="!h-2 !w-2 !border-0" style={{ background: m.colour }} />
    </motion.div>
  );
});

const nodeTypes = { kind: KindNode };

function layout(d: Doctrine) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 70, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of d.flow.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of d.flow.edges) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of d.flow.nodes) { const p = g.node(n.id); pos.set(n.id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }); }
  return pos;
}

export interface FlowProps {
  doctrine: Doctrine;
  selectedId?: string;
  onSelect: (n: FlowNode | undefined) => void;
  /** Start playing the development as soon as the chart is ready. */
  autoPlay?: boolean;
}

function FlowInner({ doctrine, selectedId, onSelect, autoPlay }: FlowProps) {
  const reduce = useReducedMotion();
  const pos = useMemo(() => layout(doctrine), [doctrine]);
  const years = useMemo(() => {
    const ys = doctrine.flow.nodes.map((n) => n.year).filter((y): y is number => y !== undefined);
    return { min: Math.min(...ys, 30), max: Math.max(...ys, 2000) };
  }, [doctrine]);
  const [year, setYear] = useState(years.max);
  const [playing, setPlaying] = useState(false);
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const seen = useRef(new Set<string>());
  const rf = useReactFlow();

  useEffect(() => { setYear(years.max); seen.current = new Set(doctrine.flow.nodes.map((n) => n.id)); }, [doctrine, years.max]);

  // "Play the development": sweep the year scrubber; nodes appear chronologically.
  useEffect(() => {
    if (!playing) return;
    const ordered = [...new Set(doctrine.flow.nodes.map((n) => n.year ?? years.min))].sort((p, q) => p - q);
    let i = ordered.findIndex((y) => y > year);
    if (i < 0) i = 0;
    const tick = setInterval(() => {
      if (i >= ordered.length) { setPlaying(false); clearInterval(tick); return; }
      setYear(ordered[i++]);
    }, reduce ? 300 : 700);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const play = () => {
    if (year >= years.max) { seen.current = new Set(); setYear(years.min - 1); }
    setPlaying(true);
  };
  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(play, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, doctrine.id]);

  // Open on the root question and its first answers at a readable zoom, rather than the whole (tiny) graph.
  const initialFit = useMemo(() => {
    const root = doctrine.flow.nodes.find((n) => n.kind === 'question') ?? doctrine.flow.nodes[0];
    const near = doctrine.flow.edges.filter((e) => e.from === root?.id).map((e) => ({ id: e.to }));
    return { padding: 0.25, maxZoom: 1, minZoom: 0.55, nodes: root ? [{ id: root.id }, ...near] : undefined };
  }, [doctrine]);
  const visible = (n: FlowNode) => n.year === undefined || n.year <= year;
  const nodes: Node<FlowData>[] = doctrine.flow.nodes.filter(visible).map((n) => {
    const fresh = !seen.current.has(n.id);
    return {
      id: n.id,
      type: 'kind',
      position: pos.get(n.id)!,
      data: { node: n, selected: n.id === selectedId, fresh, dimmed: !!kindFilter && n.kind !== kindFilter },
    };
  });
  useEffect(() => { for (const n of nodes) seen.current.add(n.id); });
  const visIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = doctrine.flow.edges
    .filter((e) => visIds.has(e.from) && visIds.has(e.to))
    .map((e) => {
      const m = EDGE_META[e.kind];
      return {
        id: `${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        label: m.label,
        animated: playing || e.from === selectedId || e.to === selectedId,
        style: { stroke: m.colour, strokeWidth: e.from === selectedId || e.to === selectedId ? 2.6 : 1.6, strokeDasharray: m.dashed ? '6 4' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: m.colour, width: 16, height: 16 },
      };
    });

  useEffect(() => {
    // While playing, follow the nodes that just appeared at a readable zoom.
    if (!playing) return;
    const latest = doctrine.flow.nodes.filter((n) => n.year === year).map((n) => ({ id: n.id }));
    if (!latest.length) return;
    const t = setTimeout(() => rf.fitView({ nodes: latest, duration: 500, padding: 0.8, maxZoom: 1, minZoom: 0.6 }), 60);
    return () => clearTimeout(t);
  }, [year, playing, rf, doctrine]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
        <button className="btn btn-primary !py-1.5" onClick={() => (playing ? setPlaying(false) : play())}>
          <Icon name={playing ? 'pause' : 'play'} size={15} /> {playing ? 'Pause' : 'Play the development'}
        </button>
        <label className="flex min-w-[200px] flex-1 items-center gap-2 text-sm">
          <span className="w-16 text-right font-bold tabular-nums text-accent">{formatYear(Math.max(years.min, year))}</span>
          <input type="range" min={years.min - 1} max={years.max} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} className="flex-1 accent-[var(--accent)]" aria-label="Year scrubber" />
        </label>
      </div>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
        {Object.entries(FLOW_KIND_META).map(([k, m]) => (
          <button key={k} onClick={() => setKindFilter((f) => (f === k ? null : k))} className={cx('chip cursor-pointer', kindFilter === k && '!border-accent')} aria-pressed={kindFilter === k}>
            <Icon name={m.icon} size={12} style={{ color: m.colour }} /> {m.label}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={initialFit}
          minZoom={0.15}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, n) => onSelect(doctrine.flow.nodes.find((x) => x.id === n.id))}
          onPaneClick={() => onSelect(undefined)}
        >
          <Background gap={22} size={1} color="var(--line)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(n) => FLOW_KIND_META[(n.data as FlowData).node.kind].colour} maskColor="rgb(0 0 0 / 0.08)" style={{ background: 'var(--surface)' }} className="!hidden sm:!block" />
        </ReactFlow>
      </div>
    </div>
  );
}

export function DoctrineFlow(props: FlowProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
