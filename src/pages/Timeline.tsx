import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { scaleLinear, select, zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3';
import { useAtlas } from '../data/db';
import { CATEGORY_META, FAMILIES, REGION_LABEL, formatYear, inkTone } from '../data/families';
import type { EntityType, Tradition } from '../data/schema';
import { Icon } from '../components/Icon';
import { PageHeader, cx } from '../components/ui';
import { Drawer, EntityPeek } from '../components/Drawer';

interface Item { type: EntityType; id: string; label: string; start: number; end?: number; colour: string; lane: Lane; families: string[]; regions: string[]; category?: string }
type Lane = 'events' | 'people' | 'works' | 'doctrines';
const LANES: { id: Lane; label: string; rows: number; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'events', label: 'Events', rows: 9, icon: 'timeline' },
  { id: 'people', label: 'People', rows: 7, icon: 'people' },
  { id: 'works', label: 'Writings', rows: 4, icon: 'book' },
  { id: 'doctrines', label: 'Doctrines', rows: 4, icon: 'trinity' },
];
const ROW = 24;
const MIN_YEAR = 0;
const MAX_YEAR = 2030;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export default function Timeline() {
  const a = useAtlas();
  const [wrap, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [cats, setCats] = useState<Set<string>>(new Set(Object.keys(CATEGORY_META)));
  const [family, setFamily] = useState('');
  const [region, setRegion] = useState('');
  const [lanesOn, setLanesOn] = useState<Set<Lane>>(new Set(LANES.map((l) => l.id)));
  const [sel, setSel] = useState<Item | null>(null);
  const [hover, setHover] = useState<{ item: Item; x: number; y: number } | null>(null);

  const tradFamily = useMemo(() => new Map(a.traditions.map((tr: Tradition) => [tr.id, tr.family])), [a.traditions]);
  const fams = (ids: string[]) => [...new Set(ids.map((i) => tradFamily.get(i)).filter(Boolean) as string[])];

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const e of a.events) out.push({ type: 'event', id: e.id, label: e.title, start: e.year, end: e.endYear, colour: CATEGORY_META[e.category].colour, lane: 'events', families: fams(e.traditionIds), regions: e.regions, category: e.category });
    for (const p of a.people) if (p.born !== undefined || p.died !== undefined) {
      const f = fams(p.traditionIds);
      out.push({ type: 'person', id: p.id, label: p.name, start: p.born ?? (p.died! - 50), end: p.died ?? Math.min(p.born! + 70, 2026), colour: f[0] ? FAMILIES[f[0] as keyof typeof FAMILIES].colour : '#888', lane: 'people', families: f, regions: p.regions });
    }
    for (const w of a.works) {
      const au = w.authorId ? a.get<{ traditionIds: string[]; regions: string[] }>('person', w.authorId) : undefined;
      out.push({ type: 'work', id: w.id, label: w.title, start: w.year, colour: '#3a6fc2', lane: 'works', families: fams(au?.traditionIds ?? []), regions: au?.regions ?? [] });
    }
    for (const p of a.positions) if (p.originYear !== undefined) out.push({ type: 'position', id: p.id, label: p.name, start: p.originYear, colour: '#7a4fc2', lane: 'doctrines', families: fams(p.traditionIds), regions: [] });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a]);

  const filtered = items.filter(
    (i) => lanesOn.has(i.lane) && (!i.category || cats.has(i.category)) && (!family || i.families.includes(family)) && (!region || i.regions.includes(region)),
  );

  const x0 = useMemo(() => scaleLinear().domain([MIN_YEAR, MAX_YEAR]).range([0, width]), [width]);
  const x = t.rescaleX(x0);
  const activeLanes = LANES.filter((l) => lanesOn.has(l.id));
  const laneTop = new Map<Lane, number>();
  let acc = 40;
  for (const l of activeLanes) { laneTop.set(l.id, acc); acc += l.rows * ROW + 28; }
  const height = acc;

  // Greedy row packing at the current zoom so labels never overlap.
  const placed = useMemo(() => {
    const out: (Item & { row: number; x1: number; x2: number; showLabel: boolean })[] = [];
    for (const lane of activeLanes) {
      const rowsEnd: number[] = Array(lane.rows).fill(-Infinity);
      const list = filtered.filter((i) => i.lane === lane.id).sort((p, q) => p.start - q.start);
      for (const it of list) {
        const x1 = x(it.start);
        const x2 = it.end !== undefined ? Math.max(x(it.end), x1 + 4) : x1;
        if (x2 < -200 || x1 > width + 50) continue;
        const labelW = it.label.length * 6.4 + 16;
        const need = Math.max(x2, x1 + labelW);
        let row = rowsEnd.findIndex((end) => end < x1 - 4);
        let showLabel = true;
        if (row === -1) { row = rowsEnd.indexOf(Math.min(...rowsEnd)); showLabel = false; }
        rowsEnd[row] = showLabel ? need : Math.max(rowsEnd[row], x2 + 6);
        out.push({ ...it, row, x1, x2, showLabel });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, t, width, lanesOn, cats, family, region]);

  useEffect(() => {
    if (!svgRef.current) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 400])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .filter((ev) => ev.type === 'wheel' || !ev.button)
      .on('zoom', (ev) => setT(ev.transform));
    zoomRef.current = z;
    select(svgRef.current).call(z).on('dblclick.zoom', null);
    return () => { select(svgRef.current!).on('.zoom', null); };
  }, [width, height]);

  const zoomTo = (from: number, to: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const k = Math.min(400, (MAX_YEAR - MIN_YEAR) / Math.max(1, to - from));
    const tx = -x0(from) * k;
    select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, zoomIdentity.translate(tx, 0).scale(k));
  };
  const zoomBy = (f: number) => svgRef.current && zoomRef.current && select(svgRef.current).transition().duration(400).call(zoomRef.current.scaleBy, f);

  const span = x.domain()[1] - x.domain()[0];
  const tickStep = span > 800 ? 100 : span > 300 ? 50 : span > 120 ? 20 : span > 50 ? 10 : span > 20 ? 5 : 1;
  const ticks: number[] = [];
  for (let y = Math.ceil(x.domain()[0] / tickStep) * tickStep; y <= x.domain()[1]; y += tickStep) ticks.push(y);
  const zoomLabel = span > 400 ? 'Centuries' : span > 40 ? 'Decades' : 'Years';

  return (
    <div>
      <PageHeader eyebrow="Explore" icon="timeline" title="Master Timeline">
        Drag to pan, scroll or pinch to zoom from centuries to single years. Click anything for details.
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button className="btn !px-2.5" onClick={() => zoomBy(0.5)} aria-label="Zoom out">−</button>
          <button className="btn !px-2.5" onClick={() => zoomBy(2)} aria-label="Zoom in">+</button>
          <button className="btn" onClick={() => zoomTo(MIN_YEAR, MAX_YEAR)}>Reset</button>
        </div>
        <span className="chip">{zoomLabel} · {formatYear(Math.round(x.domain()[0]))} – {formatYear(Math.round(x.domain()[1]))}</span>
        <div className="flex flex-wrap gap-1">
          {LANES.map((l) => (
            <button key={l.id} onClick={() => setLanesOn((s) => { const n = new Set(s); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n.size ? n : s; })} className={cx('chip cursor-pointer', lanesOn.has(l.id) ? '!border-accent !text-accent' : 'opacity-60')} aria-pressed={lanesOn.has(l.id)}>
              <Icon name={l.icon} size={13} /> {l.label}
            </button>
          ))}
        </div>
        <select className="btn !py-1.5" value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Filter by tradition family">
          <option value="">All traditions</option>
          {Object.entries(FAMILIES).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
        </select>
        <select className="btn !py-1.5" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
          <option value="">All regions</option>
          {Object.entries(REGION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {Object.entries(CATEGORY_META).map(([k, m]) => (
          <button key={k} onClick={() => setCats((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} className={cx('chip cursor-pointer transition', !cats.has(k) && 'opacity-40')} style={{ borderColor: cats.has(k) ? m.colour : undefined }} aria-pressed={cats.has(k)}>
            <Icon name={m.icon} size={12} style={{ color: m.colour }} /> {m.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {a.eras.map((e) => (
          <button key={e.id} onClick={() => zoomTo(e.startYear - 5, e.endYear + 5)} className="chip cursor-pointer hover:scale-105" style={{ borderColor: e.colour }}>
            <span className="h-2 w-2 rounded-full" style={{ background: e.colour }} /> {e.short}
          </button>
        ))}
      </div>

      <div ref={wrap} className="card relative cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing">
        <svg ref={svgRef} width={width} height={height} role="img" aria-label="Zoomable timeline">
          {a.eras.map((e) => (
            <g key={e.id}>
              <rect x={x(e.startYear)} y={0} width={Math.max(0, x(e.endYear) - x(e.startYear))} height={height} fill={e.colour} opacity={0.06} />
              <rect x={x(e.startYear)} y={0} width={Math.max(0, x(e.endYear) - x(e.startYear))} height={6} fill={e.colour} opacity={0.8} />
              {x(e.endYear) - x(e.startYear) > 90 && (
                <text x={Math.max(x(e.startYear), 0) + 6} y={22} fontSize={11} fontWeight={700} fill={inkTone(e.colour)}>{e.short}</text>
              )}
            </g>
          ))}
          {ticks.map((y) => (
            <g key={y}>
              <line x1={x(y)} x2={x(y)} y1={28} y2={height} stroke="var(--line)" strokeDasharray="2 4" />
              <text x={x(y) + 3} y={height - 6} fontSize={10} fill="var(--muted)">{formatYear(y)}</text>
            </g>
          ))}
          {activeLanes.map((l) => (
            <g key={l.id}>
              <line x1={0} x2={width} y1={laneTop.get(l.id)! - 8} y2={laneTop.get(l.id)! - 8} stroke="var(--line)" />
              <text x={8} y={laneTop.get(l.id)! + 4} fontSize={10} fontWeight={800} fill="var(--muted)" style={{ letterSpacing: '0.15em' }}>{l.label.toUpperCase()}</text>
            </g>
          ))}
          {placed.map((it) => {
            const y = laneTop.get(it.lane)! + 14 + it.row * ROW;
            const isSpan = it.x2 - it.x1 > 4;
            return (
              <g
                key={it.type + it.id}
                className="cursor-pointer"
                onClick={() => setSel(it)}
                onPointerEnter={(e) => setHover({ item: it, x: e.clientX, y: e.clientY })}
                onPointerLeave={() => setHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`${it.label}, ${formatYear(it.start)}`}
                onKeyDown={(e) => e.key === 'Enter' && setSel(it)}
                style={{ transition: 'transform .25s' }}
              >
                {isSpan ? (
                  <rect x={it.x1} y={y - 4} width={it.x2 - it.x1} height={8} rx={4} fill={it.colour} opacity={0.75} />
                ) : it.lane === 'doctrines' ? (
                  <rect x={it.x1 - 4} y={y - 4} width={8} height={8} transform={`rotate(45 ${it.x1} ${y})`} fill={it.colour} />
                ) : (
                  <circle cx={it.x1} cy={y} r={4.5} fill={it.colour} stroke="var(--surface)" strokeWidth={1.5} />
                )}
                {it.showLabel && (
                  <text x={(isSpan ? it.x1 : it.x1 + 8) + (isSpan ? 4 : 0)} y={isSpan ? y - 7 : y + 4} fontSize={11} fontWeight={600} fill="var(--ink-2)">
                    {it.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="card pointer-events-none fixed z-50 max-w-xs px-3 py-2 text-sm shadow-xl" style={{ left: Math.min(hover.x + 12, innerWidth - 300), top: hover.y + 14 }}>
            <div className="font-bold">{hover.item.label}</div>
            <div className="text-xs text-muted">{formatYear(hover.item.start)}{hover.item.end ? `–${formatYear(hover.item.end)}` : ''}</div>
          </motion.div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Showing {placed.length} of {filtered.length} matching items in view · Faded dots without labels are packed; zoom in to read them.</p>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.label}>
        {sel && <EntityPeek type={sel.type} id={sel.id} />}
      </Drawer>
    </div>
  );
}
