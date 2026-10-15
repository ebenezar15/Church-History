import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { geoGraticule10, geoNaturalEarth1, geoMercator, geoPath, select, zoom, zoomIdentity, type ZoomTransform } from 'd3';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import { cx } from '../components/ui';

export interface MapRoute { id: string; title: string; colour: string; year: number; stops: { name: string; lng: number; lat: number }[] }
export interface MapPoint { id: string; name: string; lng: number; lat: number; colour: string; year?: number; size?: number; label?: boolean }

const W = 960;
const H = 520;
let worldCache: FeatureCollection | null = null;

/** Animated map of mission journeys and places. Routes draw themselves in; a dot travels each route. */
export function MissionMap({
  routes = [], points = [], year, focus = 'world', selected, onSelect, height = 'auto', className,
}: {
  routes?: MapRoute[];
  points?: MapPoint[];
  year?: number;
  focus?: 'world' | 'india' | { lng: [number, number]; lat: [number, number] };
  selected?: string;
  onSelect?: (kind: 'route' | 'point', id: string) => void;
  height?: number | 'auto';
  className?: string;
}) {
  const [land, setLand] = useState<FeatureCollection | null>(worldCache);
  const [tf, setTf] = useState<ZoomTransform>(zoomIdentity);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (land) return;
    import('world-atlas/countries-110m.json').then((m) => {
      const topo = (m.default ?? m) as unknown as Topology;
      worldCache = feature(topo, topo.objects.countries) as unknown as FeatureCollection;
      setLand(worldCache);
    });
  }, [land]);

  useEffect(() => {
    if (!svgRef.current) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]]).on('zoom', (e) => setTf(e.transform));
    select(svgRef.current).call(z);
    const el = svgRef.current;
    return () => { select(el).on('.zoom', null); };
  }, []);

  const projection = useMemo(() => {
    if (focus === 'world') return geoNaturalEarth1().scale(172).translate([W / 2, H / 2 + 18]);
    const box = focus === 'india' ? { lng: [67, 98] as [number, number], lat: [6, 36.5] as [number, number] } : focus;
    const outline: Feature<Geometry> = {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[box.lng[0], box.lat[0]], [box.lng[1], box.lat[0]], [box.lng[1], box.lat[1]], [box.lng[0], box.lat[1]], [box.lng[0], box.lat[0]]]] },
    };
    return geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], outline);
  }, [focus]);
  const path = useMemo(() => geoPath(projection), [projection]);

  const visibleRoutes = routes.filter((r) => year === undefined || r.year <= year);
  const visiblePoints = points.filter((p) => year === undefined || p.year === undefined || p.year <= year);
  const k = tf.k;

  return (
    <div className={cx('relative overflow-hidden rounded-2xl border border-line bg-surface-2', className)}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full cursor-grab touch-none active:cursor-grabbing" style={height === 'auto' ? undefined : { height }} role="img" aria-label="Map">
        <defs>
          <radialGradient id="mm-sea" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mm-sea)" />
        <g transform={tf.toString()}>
          {focus === 'world' && <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="var(--line)" strokeWidth={0.4 / k} />}
          {land?.features.map((f, i) => (
            <path
              key={i}
              d={path(f) ?? ''}
              fill={focus !== 'world' && String(f.id) === '356' ? 'color-mix(in oklab, var(--accent) 16%, var(--surface))' : 'var(--bg-2)'}
              stroke="var(--line)"
              strokeWidth={0.5 / k}
            />
          ))}
          {visibleRoutes.map((r, i) => {
            const d = path({ type: 'LineString', coordinates: r.stops.map((s) => [s.lng, s.lat]) }) ?? '';
            const on = selected === r.id;
            const dim = selected && !on;
            return (
              <g key={r.id} opacity={dim ? 0.25 : 1} className="cursor-pointer" onClick={() => onSelect?.('route', r.id)}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={12 / k} />
                <motion.path
                  id={`mm-${r.id}`}
                  d={d}
                  fill="none"
                  stroke={r.colour}
                  strokeWidth={(on ? 3.2 : 1.8) / k}
                  strokeLinecap="round"
                  strokeDasharray={on ? undefined : `${6 / k} ${3 / k}`}
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.95 }}
                  transition={{ duration: 1.6, delay: Math.min(i, 20) * 0.06, ease: 'easeInOut' }}
                >
                  <title>{r.title}</title>
                </motion.path>
                {!reduce && (
                  <circle r={(on ? 4 : 2.6) / k} fill={r.colour}>
                    <animateMotion dur={`${4 + (i % 5)}s`} repeatCount="indefinite" begin={`${(i % 7) * 0.4}s`}>
                      <mpath href={`#mm-${r.id}`} />
                    </animateMotion>
                  </circle>
                )}
                {on && r.stops.map((s, j) => {
                  const [x, y] = projection([s.lng, s.lat]) ?? [0, 0];
                  return (
                    <g key={j}>
                      <circle cx={x} cy={y} r={3.5 / k} fill="var(--surface)" stroke={r.colour} strokeWidth={1.5 / k} />
                      <text x={x + 6 / k} y={y - 5 / k} fontSize={11 / k} className="fill-ink font-semibold" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 / k }}>
                        {j + 1}. {s.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          {visiblePoints.map((p, i) => {
            const xy = projection([p.lng, p.lat]);
            if (!xy) return null;
            const on = selected === p.id;
            const r = (p.size ?? 4) * (on ? 1.6 : 1);
            return (
              <motion.g
                key={p.id}
                className="cursor-pointer"
                onClick={() => onSelect?.('point', p.id)}
                initial={reduce ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: selected && !on ? 0.35 : 1, scale: 1 }}
                transition={{ delay: Math.min(i, 40) * 0.02, type: 'spring', stiffness: 260, damping: 18 }}
                style={{ transformOrigin: `${xy[0]}px ${xy[1]}px` }}
              >
                <circle cx={xy[0]} cy={xy[1]} r={(r + 5) / k} fill={p.colour} opacity={0.18}>
                  {!reduce && <animate attributeName="r" values={`${r / k};${(r + 9) / k};${r / k}`} dur="2.8s" repeatCount="indefinite" begin={`${(i % 9) * 0.3}s`} />}
                </circle>
                <circle cx={xy[0]} cy={xy[1]} r={r / k} fill={p.colour} stroke="var(--surface)" strokeWidth={1 / k}>
                  <title>{p.name}</title>
                </circle>
                {(p.label || on) && (
                  <text x={xy[0] + (r + 3) / k} y={xy[1] + 3.5 / k} fontSize={10.5 / k} className="fill-ink" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 / k }}>
                    {p.name}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted">⇲ scroll / pinch to zoom · drag to pan</div>
    </div>
  );
}
