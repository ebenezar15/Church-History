import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { select, zoom, zoomIdentity, type ZoomTransform } from 'd3';
import { useAtlas } from '../data/db';
import { layoutLanes, lanePath, timeScale, type Lane } from '../viz/river';
import { FAMILIES, formatYear, inkTone } from '../data/families';
import type { Event, TraditionFamily } from '../data/schema';
import { Icon } from '../components/Icon';
import { GlowCard, PageHeader, Tabs, cx } from '../components/ui';
import { Drawer, EntityPeek } from '../components/Drawer';

const W = 1400;
const LANE = 34;

export default function FamilyTree() {
  const a = useAtlas();
  const nav = useNavigate();
  const [view, setView] = useState<'river' | 'families'>('river');
  const [hoverId, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [find, setFind] = useState('');
  const hover = hoverId ?? pinned;
  const [famOff, setFamOff] = useState<Set<TraditionFamily>>(new Set());
  const [splitEvent, setSplitEvent] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const x = useMemo(() => timeScale(W), []);
  const lanes = useMemo(() => layoutLanes(a.traditions, LANE, (tr) => !famOff.has(tr.family)), [a.traditions, famOff]);
  const H = lanes.length * LANE;

  // Lineage of the hovered tradition: all ancestors + descendants.
  const lineage = useMemo(() => {
    if (!hover) return null;
    const s = new Set<string>([hover]);
    const up = (id: string) => a.get<{ parentIds: string[] }>('tradition', id)?.parentIds.forEach((p) => { if (!s.has(p)) { s.add(p); up(p); } });
    const down = (id: string) => (a.childrenOf.get(id) ?? []).forEach((c) => { if (!s.has(c.id)) { s.add(c.id); down(c.id); } });
    up(hover); down(hover);
    return s;
  }, [hover, a]);

  useEffect(() => {
    if (pinned) document.querySelector(`[data-tid="${pinned}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [pinned]);

  useEffect(() => {
    if (!svgRef.current || view !== 'river') return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([0.6, 6]).on('zoom', (e) => setT(e.transform));
    select(svgRef.current).call(z).on('dblclick.zoom', null);
    return () => { select(svgRef.current!).on('.zoom', null); };
  }, [view]);

  const famCounts = useMemo(() => {
    const m = new Map<TraditionFamily, number>();
    for (const tr of a.traditions) m.set(tr.family, (m.get(tr.family) ?? 0) + 1);
    return m;
  }, [a.traditions]);

  return (
    <div>
      <PageHeader eyebrow="Explore" icon="tree" title="Family Tree of Traditions">
        From the apostolic community to today’s global church. Each branch is coloured by family and drawn in proportion to its
        present size; the split points link to the events that caused them. Hover a branch to trace its lineage; drag and scroll to zoom.
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="btn !justify-start sm:w-80">
          <Icon name="search" className="text-muted" />
          <input
            list="tradition-names"
            value={find}
            onChange={(e) => {
              setFind(e.target.value);
              const t = a.traditions.find((x) => x.name.toLowerCase() === e.target.value.toLowerCase());
              setPinned(t ? t.id : null);
            }}
            placeholder={`Find one of ${a.traditions.length} traditions…`}
            className="w-full bg-transparent outline-none"
            aria-label="Find a tradition and highlight its lineage"
          />
          {pinned && <button onClick={() => { setPinned(null); setFind(''); }} aria-label="Clear"><Icon name="close" size={14} /></button>}
        </label>
        <datalist id="tradition-names">{a.traditions.map((t) => <option key={t.id} value={t.name} />)}</datalist>
        <Tabs layoutId="tree-tabs" value={view} onChange={setView} tabs={[{ id: 'river', label: 'Branching river', icon: 'water' }, { id: 'families', label: 'By family', icon: 'layers' }]} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(FAMILIES) as TraditionFamily[]).filter((f) => famCounts.get(f)).map((f) => (
          <button key={f} onClick={() => setFamOff((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n; })} className={cx('chip cursor-pointer', famOff.has(f) && 'opacity-40 line-through')} aria-pressed={!famOff.has(f)}>
            <Icon name={FAMILIES[f].icon} size={12} style={{ color: FAMILIES[f].colour }} /> {FAMILIES[f].label}
          </button>
        ))}
      </div>

      {view === 'river' ? (
        <div className="card relative cursor-grab overflow-hidden active:cursor-grabbing">
          <svg ref={svgRef} viewBox={`-30 -30 ${W + 420} ${H + 70}`} className="h-auto w-full touch-none" role="img" aria-label="Branching tree of Christian traditions">
            <g transform={t.toString()}>
              {[100, 300, 500, 800, 1000, 1200, 1500, 1600, 1700, 1800, 1900, 2000].map((y) => (
                <g key={y}>
                  <line x1={x(y)} x2={x(y)} y1={-15} y2={H} stroke="var(--line)" strokeDasharray="2 6" />
                  <text x={x(y)} y={H + 22} textAnchor="middle" fontSize={14} fill="var(--muted)">{y}</text>
                </g>
              ))}
              {lanes.map((l: Lane, i) => {
                const dim = lineage && !lineage.has(l.t.id);
                return (
                  <g key={l.t.id} data-tid={l.t.id} style={{ opacity: dim ? 0.12 : 1, transition: 'opacity .25s' }} onPointerEnter={() => setHover(l.t.id)} onPointerLeave={() => setHover(null)} onClick={() => nav(`/traditions/${l.t.id}`)} className="cursor-pointer">
                    <motion.path
                      d={lanePath(l, x, 80)}
                      stroke={l.colour}
                      strokeWidth={l.width}
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, delay: 0.1 + i * 0.025, ease: 'easeInOut' }}
                    />
                    <path d={lanePath(l, x, 80)} stroke="transparent" strokeWidth={Math.max(14, l.width + 8)} fill="none" />
                    <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.025 }} x={x(l.end) + 8} y={l.y + 4} fontSize={17} fontWeight={700} fill={inkTone(l.colour)}>
                      {l.t.name}{l.t.endYear ? ` †${l.t.endYear}` : ''}
                    </motion.text>
                    {l.t.family === 'nontrinitarian' && <text x={x(l.end) + 8} y={l.y + 18} fontSize={11} fill="var(--muted)">outside historic Nicene orthodoxy</text>}
                  </g>
                );
              })}
              {lanes.filter((l) => l.t.splitEventId).map((l) => {
                const ev = a.get<Event>('event', l.t.splitEventId!);
                return ev ? (
                  <g key={'s' + l.t.id} className="cursor-pointer" onClick={() => setSplitEvent(ev.id)} role="button" tabIndex={0} aria-label={`Split event: ${ev.title}`} onKeyDown={(e) => e.key === 'Enter' && setSplitEvent(ev.id)}>
                    <motion.circle cx={x(l.start)} cy={l.parentY ?? l.y} r={7} fill="var(--surface)" stroke={l.colour} strokeWidth={2.5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} whileHover={{ scale: 1.5 }} />
                    <title>{ev.title} ({formatYear(ev.year)})</title>
                  </g>
                ) : null;
              })}
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-bg/80 px-3 py-1.5 text-xs text-muted backdrop-blur">
            ○ split events — click for causes · line width ≈ present adherents
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(FAMILIES) as TraditionFamily[]).filter((f) => famCounts.get(f) && !famOff.has(f)).map((f) => (
            <section key={f}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold" style={{ color: inkTone(FAMILIES[f].colour) }}>
                <Icon name={FAMILIES[f].icon} /> {FAMILIES[f].label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {a.traditions.filter((tr) => tr.family === f).sort((p, q) => p.foundedYear - q.foundedYear).map((tr) => (
                  <GlowCard key={tr.id} to={`/traditions/${tr.id}`} accent={FAMILIES[f].colour}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-bold">{tr.name}</h3>
                      <span className="text-xs tabular-nums text-muted">{formatYear(tr.foundedYear)}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-ink-2">{tr.summary}</p>
                  </GlowCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Drawer open={!!splitEvent} onClose={() => setSplitEvent(null)}>
        {splitEvent && (
          <EntityPeek
            type="event"
            id={splitEvent}
            extra={(() => {
              const ev = a.get<Event>('event', splitEvent);
              return ev && ev.causes.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-1 text-sm font-bold">Causes</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{ev.causes.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              ) : null;
            })()}
          />
        )}
      </Drawer>
      <p className="mt-4 text-sm text-muted">Want details side by side? Add traditions to the <Link to="/compare" className="text-accent underline">compare tray</Link> from any tradition page.</p>
    </div>
  );
}
