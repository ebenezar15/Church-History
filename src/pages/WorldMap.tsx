import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { geoNaturalEarth1, geoPath, geoGraticule10, select, zoom, zoomIdentity, type ZoomTransform } from 'd3';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import type { Topology } from 'topojson-specification';
import { useAtlas } from '../data/db';
import { CATEGORY_META, formatYear, inkTone } from '../data/families';
import { Icon } from '../components/Icon';
import { PageHeader, cx } from '../components/ui';
import { Drawer, EntityPeek } from '../components/Drawer';
import type { EntityType } from '../data/schema';

const W = 960;
const H = 500;
type Layer = 'communities' | 'routes' | 'councils' | 'revivals' | 'experiences' | 'events';
const LAYERS: { id: Layer; label: string; icon: Parameters<typeof Icon>[0]['name']; colour: string }[] = [
  { id: 'communities', label: 'Communities & centres', icon: 'cross', colour: 'var(--accent)' },
  { id: 'routes', label: 'Mission routes', icon: 'compass', colour: '#2a8fb8' },
  { id: 'councils', label: 'Councils', icon: 'scroll', colour: '#b8892b' },
  { id: 'revivals', label: 'Revivals', icon: 'dove', colour: '#e05a2a' },
  { id: 'experiences', label: 'Experiences', icon: 'sparkles', colour: '#d07a1e' },
  { id: 'events', label: 'Other events', icon: 'timeline', colour: '#7a4fc2' },
];

export default function WorldMap() {
  const a = useAtlas();
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const [year, setYear] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<Set<Layer>>(new Set(['communities', 'routes', 'councils', 'revivals']));
  const [sel, setSel] = useState<{ type: EntityType | 'presence'; id: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);

  useEffect(() => {
    import('world-atlas/countries-110m.json').then((m) => {
      const topo = (m.default ?? m) as unknown as Topology;
      setLand(feature(topo, topo.objects.countries) as unknown as FeatureCollection);
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([1, 12]).translateExtent([[0, 0], [W, H]]).on('zoom', (e) => setT(e.transform));
    select(svgRef.current).call(z);
    return () => { select(svgRef.current!).on('.zoom', null); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => {
      const step = y < 1500 ? 10 : 4;
      if (y + step >= 2026) { setPlaying(false); return 2026; }
      return y + step;
    }), 90);
    return () => clearInterval(id);
  }, [playing]);

  const projection = useMemo(() => geoNaturalEarth1().scale(175).translate([W / 2, H / 2 + 20]), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const p = (lng: number, lat: number) => projection([lng, lat]) ?? [0, 0];

  const communities = a.presences.filter((x) => x.kind !== 'mission-route' && x.year <= year);
  const routes = a.presences.filter((x) => x.kind === 'mission-route' && x.route && x.year <= year);
  const evs = a.events.filter((e) => e.place && e.year <= year && e.year > year - 400);
  const councils = evs.filter((e) => e.category === 'council');
  const revivals = evs.filter((e) => e.category === 'revival');
  const other = evs.filter((e) => e.category !== 'council' && e.category !== 'revival');
  const exps = a.experiences.filter((x) => x.year <= year && x.year > year - 400);
  const k = t.k;
  const era = a.eraOf(year);

  const toggle = (l: Layer) => setLayers((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });

  return (
    <div>
      <PageHeader eyebrow="Explore" icon="map" title="World Map">
        Press play to watch Christianity spread from Jerusalem across Persia, Africa, Asia, Europe and the Americas.
        Communities accumulate; councils, revivals and events fade after four centuries.
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={() => { if (year >= 2026) setYear(30); setPlaying((x) => !x); }}>
          <Icon name={playing ? 'pause' : 'play'} size={15} /> {playing ? 'Pause' : 'Play'}
        </button>
        <div className="min-w-[80px] text-3xl font-bold tabular-nums text-accent">{formatYear(year)}</div>
        <AnimatePresence mode="wait">
          {era && <motion.span key={era.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="chip" style={{ borderColor: era.colour, color: inkTone(era.colour) }}>{era.name}</motion.span>}
        </AnimatePresence>
        <span className="chip ml-auto"><Icon name="cross" size={12} /> {communities.length} places with Christians</span>
      </div>
      <input type="range" min={30} max={2026} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} className="mb-3 w-full accent-[var(--accent)]" aria-label="Year" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LAYERS.map((l) => (
          <button key={l.id} onClick={() => toggle(l.id)} className={cx('chip cursor-pointer', !layers.has(l.id) && 'opacity-40')} aria-pressed={layers.has(l.id)}>
            <Icon name={l.icon} size={12} style={{ color: l.colour }} /> {l.label}
          </button>
        ))}
      </div>

      <div className="card relative overflow-hidden">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label={`Map of Christianity in ${formatYear(year)}`}>
          <defs>
            <radialGradient id="ocean" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="var(--surface)" />
              <stop offset="100%" stopColor="var(--bg-2)" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#ocean)" />
          <g transform={t.toString()}>
            <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="var(--line)" strokeWidth={0.4 / k} />
            {land?.features.map((f, i) => <path key={i} d={path(f) ?? ''} fill="color-mix(in srgb, var(--accent) 14%, var(--surface-2))" stroke="color-mix(in srgb, var(--accent) 30%, var(--line))" strokeWidth={0.6 / k} />)}

            {layers.has('routes') && routes.map((r) => {
              const d = 'M' + r.route!.map(([lng, lat]) => p(lng, lat).join(',')).join('L');
              return (
                <g key={r.id} className="cursor-pointer" onClick={() => setSel({ type: 'presence', id: r.id })}>
                  <motion.path d={d} fill="none" stroke="#2a8fb8" strokeWidth={2 / k} strokeDasharray={`${4 / k} ${3 / k}`} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.85 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={10 / k} />
                  <title>{r.label}</title>
                </g>
              );
            })}

            {layers.has('communities') && communities.map((c) => {
              const [cx_, cy] = p(c.place.lng, c.place.lat);
              const fresh = year - c.year < 25;
              return (
                <g key={c.id} className="cursor-pointer" onClick={() => setSel({ type: 'presence', id: c.id })}>
                  {fresh && <motion.circle cx={cx_} cy={cy} r={4 / k} fill="none" stroke="var(--accent)" strokeWidth={1.5 / k} initial={{ r: 3 / k, opacity: 1 }} animate={{ r: 18 / k, opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity }} />}
                  <motion.circle cx={cx_} cy={cy} r={(c.kind === 'centre' ? 4.2 : 3.2) / k} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1 / k} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} style={{ transformOrigin: `${cx_}px ${cy}px` }} />
                  <title>{c.label} ({formatYear(c.year)})</title>
                </g>
              );
            })}

            {(
              [
                ['councils', councils, 'event'],
                ['revivals', revivals, 'event'],
                ['events', other, 'event'],
              ] as const
            ).map(([layer, list]) =>
              layers.has(layer) &&
              list.map((e) => {
                const [cx_, cy] = p(e.place!.lng, e.place!.lat);
                const m = CATEGORY_META[e.category];
                const age = year - e.year;
                return (
                  <motion.g key={e.id} className="cursor-pointer" onClick={() => setSel({ type: 'event', id: e.id })} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: Math.max(0.25, 1 - age / 400), scale: 1 }} style={{ transformOrigin: `${cx_}px ${cy}px` }}>
                    <rect x={cx_ - 4.5 / k} y={cy - 4.5 / k} width={9 / k} height={9 / k} transform={`rotate(45 ${cx_} ${cy})`} fill={m.colour} stroke="var(--surface)" strokeWidth={1 / k} />
                    {k > 2.5 && <text x={cx_ + 7 / k} y={cy + 3 / k} fontSize={10 / k} fill="var(--ink-2)" fontWeight={600}>{e.title}</text>}
                    <title>{e.title} ({formatYear(e.year)})</title>
                  </motion.g>
                );
              }),
            )}

            {layers.has('experiences') && exps.map((x) => {
              const [cx_, cy] = p(x.place.lng, x.place.lat);
              return (
                <motion.g key={x.id} className="cursor-pointer" onClick={() => setSel({ type: 'experience', id: x.id })} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ transformOrigin: `${cx_}px ${cy}px` }}>
                  <path transform={`translate(${cx_ - 6 / k},${cy - 6 / k}) scale(${0.5 / k})`} d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" fill="#d07a1e" stroke="var(--surface)" strokeWidth={1.5} />
                  <title>{x.title}</title>
                </motion.g>
              );
            })}
          </g>
        </svg>
        {!land && <div className="absolute inset-0 flex items-center justify-center text-muted">Drawing the world…</div>}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button className="btn !px-2 !py-1 text-xs" onClick={() => svgRef.current && select(svgRef.current).call(zoom<SVGSVGElement, unknown>().on('zoom', (e) => setT(e.transform)).transform, zoomIdentity)}>Reset view</button>
        </div>
      </div>

      <Drawer open={!!sel} onClose={() => setSel(null)}>{sel && <EntityPeek type={sel.type} id={sel.id} />}</Drawer>
    </div>
  );
}
