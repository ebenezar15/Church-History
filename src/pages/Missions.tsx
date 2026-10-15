import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { arc as d3arc, pie as d3pie } from 'd3';
import { useAtlas, type Atlas } from '../data/db';
import type { MissionMovement } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { L, RELATION_META, STATUS_META, STREAM_META, relationLabel, statusLabel, streamLabel } from '../data/missions';
import { Icon } from '../components/Icon';
import { CountUp, PageHeader, Tabs, cx } from '../components/ui';
import { MissionMap, type MapPoint, type MapRoute } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GLane, type GNode } from '../viz/GraphFlow';

type View = 'map' | 'timeline' | 'flow' | 'compare' | 'insights';
const NOW = 2026;

export default function Missions() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'map';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const [stream, setStream] = useState<string>('');
  const list = useMemo(() => a.missions.filter((m) => !stream || m.stream === stream), [a, stream]);
  const streams = useMemo(() => [...new Set(a.missions.map((m) => m.stream))], [a]);

  const countries = new Set(a.missions.flatMap((m) => m.countries.map((c) => c.country))).size;
  const journeys = a.missions.reduce((n, m) => n + m.journeys.length, 0);
  const people = a.missions.reduce((n, m) => n + m.keyPeople.length, 0);

  return (
    <div>
      <PageHeader eyebrow={L('Explore', 'ஆராய்க')} icon="globe" title={L('Missions Through History', 'வரலாற்றில் மிஷன் பணிகள்')}>
        {L(
          'How the Christian faith crossed every border: from the apostles to the evangelical mission societies, faith missions, Pentecostals and today’s majority-world missionaries. Who went, whom they reached, how they worked, what it cost, what went wrong, and what lasted. India has its own in-depth section.',
          'கிறிஸ்தவ விசுவாசம் ஒவ்வொரு எல்லையையும் எவ்வாறு கடந்தது: அப்போஸ்தலர் முதல் சுவிசேஷ மிஷனரி சங்கங்கள், விசுவாச மிஷன்கள், பெந்தெகொஸ்தேயினர், இன்றைய உலகத் தென்பகுதி மிஷனரிகள் வரை. யார் சென்றார்கள், யாரைச் சென்றடைந்தார்கள், எவ்வாறு பணியாற்றினார்கள், அதற்கான விலை, தவறுகள், நிலைத்தவை. இந்தியாவுக்குத் தனி ஆழமான பகுதி உள்ளது.',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [a.missions.length, L('movements', 'இயக்கங்கள்'), 'layers'],
          [journeys, L('journeys mapped', 'வரைபடப் பயணங்கள்'), 'compass'],
          [countries, L('countries & regions', 'நாடுகளும் பகுதிகளும்'), 'globe'],
          [people, L('key people', 'முக்கிய நபர்கள்'), 'people'],
        ].map(([n, label, icon], i) => (
          <motion.div key={i} className="card p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Icon name={icon as 'globe'} className="mb-1 text-accent" />
            <div className="text-2xl font-bold text-ink"><CountUp to={n as number} /></div>
            <div className="text-xs text-muted">{label as string}</div>
          </motion.div>
        ))}
      </div>

      <IndiaBanner a={a} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          layoutId="mission-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'map', label: L('Journeys map', 'பயண வரைபடம்'), icon: 'map' },
            { id: 'timeline', label: L('Timeline', 'காலவரிசை'), icon: 'timeline' },
            { id: 'flow', label: L('Lineage flowchart', 'வம்சாவளி வரைபடம்'), icon: 'branch' },
            { id: 'compare', label: L('Agree & disagree', 'ஒப்புதலும் முரணும்'), icon: 'scales' },
            { id: 'insights', label: L('Insights', 'பகுப்பாய்வு'), icon: 'sparkles' },
          ]}
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !stream && '!border-accent !text-accent')} onClick={() => setStream('')}>{L('All streams', 'அனைத்தும்')}</button>
        {streams.map((s) => (
          <button key={s} className={cx('chip cursor-pointer', stream === s && '!border-accent !text-accent')} onClick={() => setStream(stream === s ? '' : s)}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: STREAM_META[s].colour }} /> {streamLabel(s)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {view === 'map' && <JourneysView list={list} />}
          {view === 'timeline' && <TimelineView list={list} />}
          {view === 'flow' && <FlowView list={list} />}
          {view === 'compare' && <CompareView list={list} />}
          {view === 'insights' && <InsightsView list={list} />}
        </motion.div>
      </AnimatePresence>

      <h2 className="mb-3 mt-10 text-xl font-bold">{L('All movements', 'அனைத்து இயக்கங்களும்')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m, i) => <MovementCard key={m.id} m={m} i={i} />)}
      </div>
    </div>
  );
}

function IndiaBanner({ a }: { a: Atlas }) {
  if (!a.indiaMissions.length) return null;
  const first = a.indiaMissions[0];
  const people = a.indiaMissions.reduce((n, m) => n + m.people.length, 0);
  return (
    <Link to="/missions/india" className="group relative mb-6 block overflow-hidden rounded-2xl border border-accent/40 p-5 sm:p-6" style={{ background: 'linear-gradient(120deg, color-mix(in oklab, #ff9933 18%, var(--surface)), var(--surface) 45%, color-mix(in oklab, #138808 16%, var(--surface)))' }}>
      <motion.div className="absolute -right-8 -top-8 text-accent opacity-10" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
        <Icon name="globe" size={160} />
      </motion.div>
      <div className="text-xs font-bold uppercase tracking-widest text-accent">{L('In depth', 'ஆழமான பகுதி')}</div>
      <div className="mt-1 text-2xl font-bold text-ink group-hover:text-accent sm:text-3xl">{L('Missions in India', 'இந்தியாவில் மிஷன் பணிகள்')} →</div>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        {L(
          `${a.indiaMissions.length} chapters from ${formatYear(first.startYear, true)} to today, ${people} key people, an animated map of mission stations, and what each mission focused on and achieved.`,
          `${formatYear(first.startYear, true)} முதல் இன்றுவரை ${a.indiaMissions.length} அத்தியாயங்கள், ${people} முக்கிய நபர்கள், மிஷன் நிலையங்களின் அசைவூட்ட வரைபடம், ஒவ்வொரு மிஷனின் கவனமும் சாதனைகளும்.`,
        )}
      </p>
    </Link>
  );
}

export function MovementCard({ m, i = 0 }: { m: MissionMovement; i?: number }) {
  const s = STATUS_META[m.status];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
      <Link to={`/missions/${m.id}`} className="card group block h-full p-4 transition hover:-translate-y-1 hover:shadow-xl" style={{ borderTop: `4px solid ${STREAM_META[m.stream].colour}` }}>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="font-bold" style={{ color: STREAM_META[m.stream].colour }}>{streamLabel(m.stream)}</span>
          <span className="tabular-nums">{formatSpan(m.startYear, m.endYear)}</span>
        </div>
        <h3 className="mb-1 font-bold leading-snug text-ink group-hover:text-accent">{m.name}</h3>
        <p className="mb-2 line-clamp-3 text-sm text-ink-2">{m.summary}</p>
        <span className="chip" style={{ color: s.colour, borderColor: s.colour }}>{s.mark} {statusLabel(m.status)}</span>
      </Link>
    </motion.div>
  );
}

// ---------- Journeys map ----------

function JourneysView({ list }: { list: MissionMovement[] }) {
  const navigate = useNavigate();
  const [year, setYear] = useState(NOW);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | undefined>();
  const routes: (MapRoute & { m: MissionMovement; j: MissionMovement['journeys'][number] })[] = list.flatMap((m) =>
    m.journeys.map((j) => ({ id: j.id, title: `${j.title} (${formatYear(j.year)})`, colour: STREAM_META[m.stream].colour, year: j.year, stops: j.stops, m, j })),
  );
  const points: MapPoint[] = list.flatMap((m) => m.countries.map((c, i) => ({ id: `${m.id}:${i}`, name: `${c.country} — ${m.name}`, lng: c.lng, lat: c.lat, colour: STREAM_META[m.stream].colour, year: c.year, size: 3 })));
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => {
      const next = y < 1500 ? y + 25 : y + 6;
      if (next >= NOW) { setPlaying(false); return NOW; }
      return next;
    }), 120);
    return () => clearInterval(id);
  }, [playing]);
  const cur = routes.find((r) => r.id === sel);
  const ptSel = sel?.includes(':') ? list.find((m) => m.id === sel.split(':')[0]) : undefined;
  const ptCountry = ptSel?.countries[Number(sel!.split(':')[1])];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => { if (year >= NOW) setYear(30); setPlaying(!playing); }}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? L('Pause', 'நிறுத்து') : L('Play history', 'வரலாற்றை இயக்கு')}
          </button>
          <input type="range" min={30} max={NOW} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} className="min-w-40 flex-1 accent-[var(--accent)]" aria-label={L('Year', 'ஆண்டு')} />
          <span className="w-24 text-right text-lg font-bold tabular-nums text-accent">{formatYear(year)}</span>
        </div>
        <MissionMap routes={routes} points={points} year={year} selected={sel} onSelect={(_, id) => setSel(sel === id ? undefined : id)} />
        <p className="mt-2 text-xs text-muted">{L('Lines are journeys (a dot travels each route); dots are countries the movement reached. Click any to see details.', 'கோடுகள் பயணங்கள் (ஒவ்வொரு வழியிலும் ஒரு புள்ளி பயணிக்கிறது); புள்ளிகள் இயக்கம் சென்றடைந்த நாடுகள். விவரங்களுக்கு எதையும் சொடுக்குங்கள்.')}</p>
      </div>
      <div className="card max-h-[620px] overflow-y-auto p-4">
        {cur ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: cur.colour }}>{cur.m.name}</div>
            <h3 className="mt-1 text-lg font-bold">{cur.j.title}</h3>
            <div className="mb-2 text-sm text-muted">{formatSpan(cur.j.year, cur.j.endYear)} · {cur.j.people}</div>
            <ol className="mb-3 space-y-1 border-l-2 pl-3 text-sm" style={{ borderColor: cur.colour }}>
              {cur.j.stops.map((s, i) => <li key={i}><b>{i + 1}.</b> {s.name}{s.year ? ` (${formatYear(s.year)})` : ''}</li>)}
            </ol>
            <p className="text-sm leading-relaxed text-ink-2">{cur.j.text}</p>
            <button className="btn mt-3" onClick={() => navigate(`/missions/${cur.m.id}`)}>{L('Open the movement', 'இயக்கத்தைத் திற')} →</button>
          </div>
        ) : ptSel && ptCountry ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: STREAM_META[ptSel.stream].colour }}>{ptSel.name}</div>
            <h3 className="mt-1 text-lg font-bold">{ptCountry.country}</h3>
            <div className="mb-2 text-sm text-muted">{L('from', '')} {formatYear(ptCountry.year)}{L('', ' முதல்')}</div>
            <p className="text-sm leading-relaxed text-ink-2">{ptCountry.text}</p>
            <button className="btn mt-3" onClick={() => navigate(`/missions/${ptSel.id}`)}>{L('Open the movement', 'இயக்கத்தைத் திற')} →</button>
          </div>
        ) : (
          <div>
            <h3 className="mb-2 font-bold">{L('Journeys', 'பயணங்கள்')} ({routes.filter((r) => r.year <= year).length})</h3>
            <ul className="space-y-1 text-sm">
              {routes.filter((r) => r.year <= year).sort((p, q) => p.year - q.year).map((r) => (
                <li key={r.id}>
                  <button className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left hover:bg-surface-2" onClick={() => setSel(r.id)}>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: r.colour }} />
                    <span><span className="tabular-nums text-muted">{formatYear(r.year)}</span> {r.j.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Timeline (swimlanes) ----------

/** Piecewise scale: the first 1,500 years take 32% of the width, the modern era the rest. */
const xOf = (y: number) => (y <= 1500 ? (y / 1500) * 32 : 32 + ((y - 1500) / (NOW - 1500)) * 68);

function TimelineView({ list }: { list: MissionMovement[] }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<MissionMovement | null>(null);
  const rows = [...list].sort((p, q) => p.startYear - q.startYear);
  const ticks = [100, 500, 1000, 1500, 1600, 1700, 1800, 1900, 2000];
  return (
    <div className="card scrollbar-thin overflow-x-auto p-4">
      <div className="relative min-w-[860px]">
        <div className="relative mb-2 h-5 text-[10px] text-muted">
          {ticks.map((y) => <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${xOf(y)}%` }}>{y}</span>)}
        </div>
        <div className="relative">
          {ticks.map((y) => <div key={y} className="absolute inset-y-0 w-px bg-line" style={{ left: `${xOf(y)}%` }} />)}
          {rows.map((m, i) => {
            const end = m.endYear ?? NOW;
            const c = STREAM_META[m.stream].colour;
            const s = STATUS_META[m.status];
            return (
              <div key={m.id} className="relative h-7" onMouseEnter={() => setHover(m)} onMouseLeave={() => setHover(null)}>
                <motion.button
                  className="absolute top-1 flex h-5 items-center overflow-hidden whitespace-nowrap rounded-full px-2 text-[11px] font-semibold text-white shadow-sm"
                  style={{ left: `${xOf(m.startYear)}%`, background: c, transformOrigin: 'left' }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: `${Math.max(xOf(end) - xOf(m.startYear), 1.2)}%`, opacity: 1 }}
                  transition={{ delay: i * 0.03, duration: 0.7, ease: 'easeOut' }}
                  onClick={() => navigate(`/missions/${m.id}`)}
                  title={m.name}
                >
                  {m.name}
                </motion.button>
                <motion.span
                  className="absolute top-1 text-sm font-bold"
                  style={{ left: `calc(${xOf(end)}% + 4px)`, color: s.colour }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 + 0.7 }}
                  title={statusLabel(m.status)}
                >
                  {m.endYear || m.status !== 'active' ? s.mark : '→'}
                </motion.span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          {Object.entries(STATUS_META).map(([k, v]) => <span key={k}><b style={{ color: v.colour }}>{v.mark}</b> {statusLabel(k as MissionMovement['status'])}</span>)}
        </div>
      </div>
      <AnimatePresence>
        {hover && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <b>{hover.name}</b> · {formatSpan(hover.startYear, hover.endYear)} · <span style={{ color: STATUS_META[hover.status].colour }}>{statusLabel(hover.status)}</span>
            <div className="text-ink-2">{hover.statusNote}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Lineage flowchart ----------

/** Movements laid out on a time axis (x) with one swimlane per stream (y), plus their relations. */
export function movementGraph(list: MissionMovement[], withInspiration = false): { nodes: GNode[]; edges: GEdge[]; lanes: GLane[]; x1780: number; y1780: number } {
  const ids = new Set(list.map((m) => m.id));
  const streams = Object.keys(STREAM_META).filter((s) => list.some((m) => m.stream === s)) as MissionMovement['stream'][];
  const SPAN = 9000;
  const lanes: GLane[] = [];
  const nodes: GNode[] = [];
  let y = 0;
  for (const s of streams) {
    const ms = list.filter((m) => m.stream === s).sort((p, q) => p.startYear - q.startYear);
    // Stack movements that would overlap horizontally into sub-rows.
    const rowsEnd: number[] = [];
    const top = y;
    for (const m of ms) {
      const x = (xOf(m.startYear) / 100) * SPAN;
      let r = rowsEnd.findIndex((end) => x > end + 20);
      if (r < 0) { r = rowsEnd.length; rowsEnd.push(0); }
      rowsEnd[r] = x + 220;
      nodes.push({
        id: m.id, label: m.name, sub: `${formatSpan(m.startYear, m.endYear)}`, colour: STREAM_META[m.stream].colour,
        badge: STATUS_META[m.status].mark + ' ' + statusLabel(m.status), badgeColour: STATUS_META[m.status].colour, x, y: top + r * 84,
      });
    }
    lanes.push({ y: top + ((rowsEnd.length - 1) * 84) / 2 + 20, label: streamLabel(s), colour: STREAM_META[s].colour });
    y = top + rowsEnd.length * 84 + 30;
  }
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    for (const r of m.relations) if (ids.has(r.to)) { const k = `${m.id}>${r.to}`; if (!seen.has(k)) { seen.add(k); edges.push({ from: m.id, to: r.to, colour: RELATION_META[r.kind].colour, dashed: RELATION_META[r.kind].dashed, label: relationLabel(r.kind) }); } }
    if (withInspiration) for (const f of m.influencedBy) if (ids.has(f)) { const k = `${f}>${m.id}`; if (!seen.has(k)) { seen.add(k); edges.push({ from: f, to: m.id, colour: 'var(--muted)', dashed: true, animated: false }); } }
  }
  const x1780 = (xOf(1780) / 100) * SPAN;
  const y1780 = Math.min(...nodes.filter((n) => (n.x ?? 0) >= x1780).map((n) => n.y ?? 0), 1e9);
  return { nodes, edges, lanes, x1780, y1780: y1780 === 1e9 ? 0 : y1780 };
}

function FlowView({ list }: { list: MissionMovement[] }) {
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | undefined>();
  const [insp, setInsp] = useState(false);
  const g = useMemo(() => movementGraph(list, insp), [list, insp]);
  const m = list.find((x) => x.id === sel);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(RELATION_META).map(([k, v]) => <span key={k} className="flex items-center gap-1"><span className="inline-block h-0.5 w-5" style={{ background: v.colour }} /> {relationLabel(k as keyof typeof RELATION_META)}</span>)}
        <label className="flex cursor-pointer items-center gap-1"><input type="checkbox" checked={insp} onChange={(e) => setInsp(e.target.checked)} className="accent-[var(--accent)]" /> <span className="inline-block w-5 border-t-2 border-dashed border-muted" /> {L('show what inspired what', 'தூண்டுதல் இணைப்புகளைக் காட்டு')}</label>
      </div>
      <p className="mb-2 text-xs text-muted">{L('Time runs left to right; each row is a stream of mission. Click a box to highlight its connections; scroll to zoom.', 'காலம் இடமிருந்து வலமாகச் செல்கிறது; ஒவ்வொரு வரிசையும் ஒரு மிஷன் பிரிவு. இணைப்புகளைக் காண ஒரு பெட்டியைச் சொடுக்குங்கள்; பெரிதாக்க உருட்டுங்கள்.')}</p>
      <GraphFlow nodes={g.nodes} edges={g.edges} lanes={g.lanes} view={{ x: -g.x1780 * 0.5 + 30, y: -g.y1780 * 0.5 + 30, zoom: 0.5 }} selected={sel} onSelect={(id) => setSel(sel === id ? undefined : id)} height={680} />
      <AnimatePresence>
        {m && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mt-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold">{m.name}</h3>
              <button className="btn ml-auto" onClick={() => navigate(`/missions/${m.id}`)}>{L('Open', 'திற')} →</button>
            </div>
            <p className="text-sm text-ink-2">{m.summary}</p>
            {m.relations.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {m.relations.map((r, i) => <li key={i}><b style={{ color: RELATION_META[r.kind].colour }}>{relationLabel(r.kind)}</b> {nameOf(list, r.to)}: {r.text}</li>)}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const nameOf = (list: MissionMovement[], id: string) => list.find((m) => m.id === id)?.name ?? id;

// ---------- Agree & disagree ----------

function CompareView({ list }: { list: MissionMovement[] }) {
  const a = useAtlas();
  const [cell, setCell] = useState<{ x: string; y: string } | null>(null);
  const rows = list.filter((m) => m.agreements.length || m.disagreements.length || a.missions.some((o) => o.agreements.some((g) => g.with === m.id) || o.disagreements.some((g) => g.with === m.id)));
  const rel = (x: MissionMovement, yId: string) => ({
    agree: x.agreements.filter((g) => g.with === yId).map((g) => g.text),
    disagree: x.disagreements.filter((g) => g.with === yId).map((g) => g.text),
  });
  const both = (x: MissionMovement, y: MissionMovement) => {
    const p = rel(x, y.id);
    const q = rel(y, x.id);
    return { agree: [...p.agree, ...q.agree], disagree: [...p.disagree, ...q.disagree] };
  };
  const cur = cell && rows.find((m) => m.id === cell.x) && rows.find((m) => m.id === cell.y);
  const detail = cur && cell ? both(rows.find((m) => m.id === cell.x)!, rows.find((m) => m.id === cell.y)!) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card scrollbar-thin overflow-auto p-3">
        <table className="border-separate border-spacing-0.5 text-[11px]">
          <thead>
            <tr>
              <th />
              {rows.map((m) => <th key={m.id} className="h-36 align-bottom"><div className="mx-auto w-4 rotate-180 whitespace-nowrap text-left font-medium text-muted [writing-mode:vertical-rl]">{m.name.slice(0, 34)}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={x.id}>
                <th className="max-w-[180px] truncate pr-2 text-right font-medium text-muted">{x.name}</th>
                {rows.map((y, j) => {
                  if (x.id === y.id) return <td key={y.id} className="h-4 w-4 rounded bg-line/40" />;
                  const r = both(x, y);
                  const bg = r.agree.length && r.disagree.length ? '#d6a02a' : r.agree.length ? '#2e9d5b' : r.disagree.length ? '#c2453a' : 'transparent';
                  const on = cell?.x === x.id && cell?.y === y.id;
                  return (
                    <td key={y.id} className="p-0">
                      <motion.button
                        className={cx('block h-4 w-4 rounded border border-line/60', on && 'ring-2 ring-accent')}
                        style={{ background: bg }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (i + j) * 0.008 }}
                        onClick={() => setCell({ x: x.id, y: y.id })}
                        aria-label={`${x.name} / ${y.name}`}
                        disabled={bg === 'transparent'}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span><b style={{ color: '#2e9d5b' }}>■</b> {L('agreed', 'ஒத்துப்போனது')}</span>
          <span><b style={{ color: '#c2453a' }}>■</b> {L('disagreed', 'முரண்பட்டது')}</span>
          <span><b style={{ color: '#d6a02a' }}>■</b> {L('both', 'இரண்டும்')}</span>
        </div>
      </div>
      <div className="card p-4">
        {detail && cell ? (
          <div>
            <h3 className="mb-2 font-bold">{nameOf(rows, cell.x)} ⟷ {nameOf(rows, cell.y)}</h3>
            {detail.agree.map((t, i) => <p key={`a${i}`} className="mb-2 border-l-4 border-[#2e9d5b] pl-2 text-sm"><b>{L('Agreed', 'ஒத்துப்போனவை')}:</b> {t}</p>)}
            {detail.disagree.map((t, i) => <p key={`d${i}`} className="mb-2 border-l-4 border-[#c2453a] pl-2 text-sm"><b>{L('Disagreed', 'முரண்பட்டவை')}:</b> {t}</p>)}
          </div>
        ) : (
          <p className="text-sm text-muted">{L('Pick a coloured square to read where two movements agreed or clashed — on theology, methods, culture or politics.', 'இரண்டு இயக்கங்கள் இறையியல், முறைகள், பண்பாடு அல்லது அரசியலில் எங்கே ஒத்துப்போயின அல்லது மோதின என்பதைப் படிக்க ஒரு வண்ணச் சதுரத்தைத் தேர்ந்தெடுங்கள்.')}</p>
        )}
      </div>
    </div>
  );
}

// ---------- Insights ----------

function InsightsView({ list }: { list: MissionMovement[] }) {
  const byStatus = Object.keys(STATUS_META).map((k) => ({ k: k as MissionMovement['status'], n: list.filter((m) => m.status === k).length })).filter((x) => x.n);
  const arcs = d3pie<{ k: string; n: number }>().value((d) => d.n).sort(null)(byStatus);
  const arc = d3arc<{ startAngle: number; endAngle: number }>().innerRadius(58).outerRadius(96).cornerRadius(4).padAngle(0.02);
  const byStream = Object.keys(STREAM_META).map((k) => ({ k: k as MissionMovement['stream'], n: list.filter((m) => m.stream === k).length })).filter((x) => x.n);
  const maxStream = Math.max(1, ...byStream.map((x) => x.n));
  // Countries reached over time (cumulative distinct countries).
  const firsts = new Map<string, number>();
  for (const m of list) for (const c of m.countries) firsts.set(c.country, Math.min(firsts.get(c.country) ?? 1e9, c.year));
  const years = [...firsts.values()].sort((p, q) => p - q);
  const pts = years.map((y, i) => [xOf(y), i + 1] as const);
  const maxN = Math.max(1, years.length);
  const line = pts.map(([x, n], i) => `${i ? 'L' : 'M'}${(x / 100) * 600},${180 - (n / maxN) * 170}`).join(' ');
  const harms = [...list].sort((p, q) => (q.harms.length + q.developments.length) - (p.harms.length + p.developments.length)).slice(0, 14);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-2 font-bold">{L('What became of them', 'அவற்றின் நிலை')}</h3>
        <div className="flex flex-wrap items-center gap-4">
          <svg viewBox="-100 -100 200 200" className="h-48 w-48">
            {arcs.map((p, i) => (
              <motion.path key={p.data.k} d={arc(p) ?? ''} fill={STATUS_META[p.data.k as MissionMovement['status']].colour} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: 'spring' }} />
            ))}
            <text textAnchor="middle" y="6" className="fill-ink text-2xl font-bold">{list.length}</text>
          </svg>
          <ul className="space-y-1 text-sm">
            {byStatus.map((x) => <li key={x.k}><b style={{ color: STATUS_META[x.k].colour }}>{STATUS_META[x.k].mark}</b> {statusLabel(x.k)} — {x.n}</li>)}
          </ul>
        </div>
      </div>
      <div className="card p-4">
        <h3 className="mb-2 font-bold">{L('Movements by stream', 'பிரிவு வாரியாக இயக்கங்கள்')}</h3>
        <div className="space-y-1.5">
          {byStream.map((x, i) => (
            <div key={x.k} className="flex items-center gap-2 text-xs">
              <span className="w-40 shrink-0 truncate text-right text-muted">{streamLabel(x.k)}</span>
              <motion.div className="h-4 rounded" style={{ background: STREAM_META[x.k].colour }} initial={{ width: 0 }} animate={{ width: `${(x.n / maxStream) * 60}%` }} transition={{ delay: i * 0.05, duration: 0.6 }} />
              <span className="tabular-nums">{x.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4 lg:col-span-2">
        <h3 className="mb-2 font-bold">{L('Countries and regions reached over time', 'காலப்போக்கில் சென்றடைந்த நாடுகளும் பகுதிகளும்')}</h3>
        <svg viewBox="0 0 600 200" className="w-full">
          {[100, 500, 1000, 1500, 1800, 1900, 2000].map((y) => (
            <g key={y}>
              <line x1={(xOf(y) / 100) * 600} x2={(xOf(y) / 100) * 600} y1={0} y2={185} stroke="var(--line)" />
              <text x={(xOf(y) / 100) * 600} y={198} textAnchor="middle" className="fill-muted text-[9px]">{y}</text>
            </g>
          ))}
          <motion.path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: 'easeInOut' }} />
          <text x={596} y={14} textAnchor="end" className="fill-ink text-xs font-bold">{maxN}</text>
        </svg>
      </div>
      <div className="card p-4 lg:col-span-2">
        <h3 className="mb-1 font-bold">{L('Lasting contributions vs harms recorded', 'நிலைத்த பங்களிப்புகளும் பதிவான தீங்குகளும்')}</h3>
        <p className="mb-3 text-xs text-muted">{L('Number of items the atlas records for each movement (not a score — open a movement to read them).', 'ஒவ்வொரு இயக்கத்துக்கும் அட்லஸ் பதிவு செய்துள்ள அம்சங்களின் எண்ணிக்கை (மதிப்பெண் அல்ல — விவரங்களுக்கு இயக்கத்தைத் திறக்கவும்).')}</p>
        <div className="space-y-1">
          {harms.map((m, i) => (
            <Link key={m.id} to={`/missions/${m.id}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs hover:text-accent">
              <div className="flex justify-end"><motion.div className="h-3 rounded-l bg-[#c2453a]" initial={{ width: 0 }} animate={{ width: `${m.harms.length * 12}%` }} transition={{ delay: i * 0.04 }} /></div>
              <span className="w-44 truncate text-center sm:w-56">{m.name}</span>
              <motion.div className="h-3 rounded-r bg-[#2e9d5b]" initial={{ width: 0 }} animate={{ width: `${m.developments.length * 12}%` }} transition={{ delay: i * 0.04 }} />
            </Link>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>← {L('harms', 'தீங்குகள்')}</span><span>{L('contributions', 'பங்களிப்புகள்')} →</span></div>
      </div>
    </div>
  );
}
