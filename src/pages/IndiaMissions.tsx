import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { IndiaMission, MissionMovement } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { L, STATUS_META, STREAM_META, statusLabel } from '../data/missions';
import { Icon } from '../components/Icon';
import { BookmarkButton, ConfidenceBadge, CountUp, PageHeader, Sources, Tabs, cx } from '../components/ui';
import { MissionMap, type MapPoint } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';
import { ListCard, PeopleGrid } from './MissionDetail';
import NotFound from './NotFound';

const SAFFRON = '#e07b10';
const GREEN = '#138808';
const NAVY = '#1f3c88';
/** A colour per chapter, running saffron → navy → green through the centuries. */
function chapterColour(i: number, n: number) {
  const stops = [SAFFRON, '#c0392b', NAVY, '#7a4fc2', GREEN];
  return stops[Math.min(stops.length - 1, Math.floor((i / Math.max(1, n)) * stops.length))];
}

type View = 'chapters' | 'map' | 'people' | 'flow' | 'numbers';

export default function IndiaMissions() {
  const a = useAtlas();
  const list = a.indiaMissions;
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'chapters';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const people = list.reduce((n, m) => n + m.people.length, 0);
  const stations = list.reduce((n, m) => n + m.stations.length, 0);

  return (
    <div>
      <Link to="/missions" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Missions', 'மிஷன் பணிகள்')}</Link>
      <div className="relative mb-2 h-1.5 overflow-hidden rounded-full">
        <motion.div className="absolute inset-0 flex" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1 }} style={{ transformOrigin: 'left' }}>
          <div className="flex-1" style={{ background: SAFFRON }} /><div className="flex-1 bg-white" /><div className="flex-1" style={{ background: GREEN }} />
        </motion.div>
      </div>
      <PageHeader eyebrow={L('In depth', 'ஆழமான பகுதி')} icon="globe" title={L('Missions in India', 'இந்தியாவில் மிஷன் பணிகள்')}>
        {L(
          'From the St Thomas Christians of Kerala to Tranquebar, Serampore, the Dalit mass movements, the Northeast and today’s Indian missionaries: who came and who rose up from within, whom they reached, what they focused on, the harms and controversies, and what came of it all.',
          'கேரளத்தின் தோமா கிறிஸ்தவர்கள் முதல் தரங்கம்பாடி, செராம்பூர், தலித் மக்கள் இயக்கங்கள், வடகிழக்கு, இன்றைய இந்திய மிஷனரிகள் வரை: யார் வந்தார்கள், உள்ளிருந்து யார் எழுந்தார்கள், யாரைச் சென்றடைந்தார்கள், எதில் கவனம் செலுத்தினார்கள், தீங்குகளும் சர்ச்சைகளும், இவற்றின் விளைவுகள்.',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[[list.length, L('chapters', 'அத்தியாயங்கள்')], [people, L('key people', 'முக்கிய நபர்கள்')], [stations, L('places mapped', 'வரைபட இடங்கள்')]].map(([n, label], i) => (
          <motion.div key={i} className="card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="text-3xl font-bold" style={{ color: [SAFFRON, NAVY, GREEN][i] }}><CountUp to={n as number} /></div>
            <div className="text-xs text-muted">{label as string}</div>
          </motion.div>
        ))}
      </div>

      <div className="mb-5">
        <Tabs
          layoutId="india-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'chapters', label: L('Chapters', 'அத்தியாயங்கள்'), icon: 'timeline' },
            { id: 'map', label: L('Mission map', 'மிஷன் வரைபடம்'), icon: 'map' },
            { id: 'people', label: L('Key people', 'முக்கிய நபர்கள்'), icon: 'people' },
            { id: 'flow', label: L('Flowchart', 'ஓட்ட வரைபடம்'), icon: 'branch' },
            { id: 'numbers', label: L('Numbers', 'எண்ணிக்கைகள்'), icon: 'layers' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {view === 'chapters' && <Chapters list={list} />}
          {view === 'map' && <IndiaMapView list={list} />}
          {view === 'people' && <PeopleDirectory list={list} />}
          {view === 'flow' && <IndiaFlow list={list} />}
          {view === 'numbers' && <Numbers list={list} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------- Chapters: an expandable, animated timeline ----------

function Chapters({ list }: { list: IndiaMission[] }) {
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const toggle = (id: string) => setParams((p) => { if (open === id) p.delete('open'); else p.set('open', id); return p; }, { replace: true });
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => document.getElementById(`ch-${open}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <LayoutGroup>
      <ol className="relative ml-3 border-l-2 border-line pl-6 sm:ml-24">
        {list.map((m, i) => {
          const c = chapterColour(i, list.length);
          const isOpen = open === m.id;
          return (
            <motion.li key={m.id} id={`ch-${m.id}`} layout className="relative mb-4 scroll-mt-20" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 20) * 0.03 }}>
              <span className="absolute -left-[33px] top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-surface" style={{ borderColor: c }}>
                <motion.span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} animate={isOpen ? { scale: [1, 1.8, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }} />
              </span>
              <span className="absolute -left-[118px] top-3.5 hidden w-20 text-right text-sm font-bold tabular-nums sm:block" style={{ color: c }}>{formatYear(m.startYear, m.confidence === 'traditional')}</span>
              <motion.div layout className={cx('card overflow-hidden', isOpen && 'ring-2')} style={{ ['--tw-ring-color' as string]: c, borderLeft: `4px solid ${c}` }}>
                <button className="block w-full p-4 text-left" onClick={() => toggle(m.id)} aria-expanded={isOpen}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-bold tabular-nums" style={{ color: c }}>{formatSpan(m.startYear, m.endYear)}</span> · <span className="line-clamp-1">{m.region}</span>
                    <motion.span className="ml-auto" animate={{ rotate: isOpen ? 90 : 0 }}><Icon name="arrow" size={14} /></motion.span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold leading-snug">{m.title}</h3>
                  {!isOpen && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{m.summary}</p>}
                  {!isOpen && m.people.length > 0 && (
                    <div className="mt-2 flex -space-x-2">
                      {m.people.slice(0, 6).map((p, k) => <span key={k} title={p.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white" style={{ background: c }}>{p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}</span>)}
                      {m.people.length > 6 && <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-2 text-[10px]">+{m.people.length - 6}</span>}
                    </div>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
                      <ChapterBody m={m} colour={c} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.li>
          );
        })}
      </ol>
    </LayoutGroup>
  );
}

function ChapterBody({ m, colour }: { m: IndiaMission; colour: string }) {
  return (
    <div className="space-y-5 px-4 pb-5">
      <p className="text-ink-2">{m.summary}</p>
      {m.stations.length > 0 && <MissionMap focus="india" points={m.stations.map((s, i) => ({ id: `s${i}`, name: s.name, lng: s.lng, lat: s.lat, colour, year: s.year, size: 5, label: true }))} />}
      {m.people.length > 0 && <div><h4 className="mb-2 font-bold">{L('Key people: focus and outcome', 'முக்கிய நபர்கள்: கவனமும் விளைவும்')}</h4><PeopleGrid people={m.people} colour={colour} /></div>}
      <div className="grid gap-3 md:grid-cols-2">
        <ListCard title={L('Focus', 'கவனம் செலுத்தியவை')} icon="compass" items={m.focus} colour={colour} />
        <ListCard title={L('Outcomes', 'விளைவுகள்')} icon="check" items={m.outcomes} colour="#2e9d5b" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/missions/india/${m.id}`} className="btn btn-primary">{L('Read the full chapter', 'முழு அத்தியாயத்தையும் படிக்க')} →</Link>
      </div>
    </div>
  );
}

// ---------- Map ----------

function IndiaMapView({ list }: { list: IndiaMission[] }) {
  const navigate = useNavigate();
  const all = useMemo(() => list.flatMap((m, i) => m.stations.map((s, k) => ({ m, i, s, id: `${m.id}:${k}` }))), [list]);
  const minY = Math.min(...all.map((x) => x.s.year ?? x.m.startYear), 50);
  const [year, setYear] = useState(2026);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | undefined>();
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => {
      const next = y < 1500 ? y + 30 : y + 5;
      if (next >= 2026) { setPlaying(false); return 2026; }
      return next;
    }), 120);
    return () => clearInterval(id);
  }, [playing]);
  const points: MapPoint[] = all.map((x) => ({ id: x.id, name: x.s.name, lng: x.s.lng, lat: x.s.lat, colour: chapterColour(x.i, list.length), year: x.s.year ?? x.m.startYear, size: 4.5 }));
  const cur = all.find((x) => x.id === sel);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => { if (year >= 2026) setYear(minY); setPlaying(!playing); }}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? L('Pause', 'நிறுத்து') : L('Play history', 'வரலாற்றை இயக்கு')}
          </button>
          <input type="range" min={minY} max={2026} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} className="min-w-40 flex-1 accent-[var(--accent)]" aria-label={L('Year', 'ஆண்டு')} />
          <span className="w-24 text-right text-lg font-bold tabular-nums text-accent">{formatYear(year)}</span>
        </div>
        <MissionMap focus="india" points={points} year={year} selected={sel} onSelect={(_, id) => setSel(sel === id ? undefined : id)} />
      </div>
      <div className="card max-h-[620px] overflow-y-auto p-4">
        {cur ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: chapterColour(cur.i, list.length) }}>{cur.m.title}</div>
            <h3 className="mt-1 text-lg font-bold">{cur.s.name}</h3>
            <div className="mb-2 text-sm text-muted">{cur.s.year ? formatYear(cur.s.year) : formatSpan(cur.m.startYear, cur.m.endYear)} · {cur.m.region}</div>
            <p className="text-sm text-ink-2">{cur.m.summary}</p>
            <button className="btn mt-3" onClick={() => navigate(`/missions/india/${cur.m.id}`)}>{L('Open the chapter', 'அத்தியாயத்தைத் திற')} →</button>
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {list.map((m, i) => (
              <li key={m.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chapterColour(i, list.length) }} />
                <Link to={`/missions/india/${m.id}`} className={cx('hover:text-accent', m.startYear > year && 'opacity-40')}><span className="tabular-nums text-muted">{formatYear(m.startYear)}</span> {m.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- People directory ----------

function PeopleDirectory({ list }: { list: IndiaMission[] }) {
  const [q, setQ] = useState('');
  const rows = list.flatMap((m, i) => m.people.map((p) => ({ p, m, c: chapterColour(i, list.length) })));
  const f = q.trim().toLowerCase();
  const shown = rows.filter((r) => !f || `${r.p.name} ${r.p.focus} ${r.p.role} ${r.p.origin ?? ''} ${r.m.region}`.toLowerCase().includes(f));
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Search people, focus, region…', 'நபர், கவனம், பகுதி தேடுக…')} className="mb-4 w-full rounded-xl border border-line bg-surface px-4 py-2.5 sm:w-96" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ p, m, c }, i) => (
          <motion.div key={`${m.id}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 18) * 0.025 }} className="card p-4" style={{ borderTop: `3px solid ${c}` }}>
            <div className="font-bold">{p.name}</div>
            <div className="text-xs text-muted">{p.years}{p.origin ? ` · ${p.origin}` : ''}</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: c }}>{p.role}</div>
            <p className="mt-1 text-sm text-ink-2"><b>{L('Focus', 'கவனம்')}:</b> {p.focus}</p>
            {p.outcome && <p className="mt-1 text-sm text-ink-2"><b>{L('Outcome', 'விளைவு')}:</b> {p.outcome}</p>}
            <Link to={`/missions/india/${m.id}`} className="mt-2 inline-block text-xs text-accent hover:underline">{m.title} →</Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------- Flowchart ----------

function IndiaFlow({ list }: { list: IndiaMission[] }) {
  const a = useAtlas();
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | undefined>();
  const g = useMemo(() => {
    const nodes: GNode[] = list.map((m, i) => ({ id: m.id, label: m.title, sub: `${formatSpan(m.startYear, m.endYear)} · ${m.region}`, colour: chapterColour(i, list.length) }));
    const edges: GEdge[] = [];
    // Each chapter follows the one before it.
    for (let i = 1; i < list.length; i++) edges.push({ from: list[i - 1].id, to: list[i].id, colour: 'var(--line)', animated: false });
    // Global movements that fed each chapter.
    const used = new Set(list.flatMap((m) => m.movementIds));
    for (const id of used) {
      const mv = a.get<MissionMovement>('mission', id);
      if (!mv) continue;
      nodes.push({ id: `mv:${id}`, label: mv.name, sub: L('Global movement', 'உலகளாவிய இயக்கம்'), colour: STREAM_META[mv.stream].colour, badge: STATUS_META[mv.status].mark, badgeColour: STATUS_META[mv.status].colour });
      for (const m of list) if (m.movementIds.includes(id)) edges.push({ from: `mv:${id}`, to: m.id, colour: STREAM_META[mv.stream].colour, dashed: true });
    }
    return { nodes, edges };
  }, [a, list]);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Chapters of Indian church history (left to right) and the global mission movements that fed them (dashed). Click a box to highlight its links; click again to open it.', 'இந்தியத் திருச்சபை வரலாற்றின் அத்தியாயங்களும் (இடமிருந்து வலம்) அவற்றுக்கு வழிவகுத்த உலகளாவிய மிஷன் இயக்கங்களும் (புள்ளிக்கோடு). இணைப்புகளைக் காண ஒரு பெட்டியைச் சொடுக்குங்கள்; திறக்க மீண்டும் சொடுக்குங்கள்.')}</p>
      <GraphFlow
        nodes={g.nodes}
        edges={g.edges}
        dir="TB"
        height={760}
        selected={sel}
        onSelect={(id) => {
          if (sel !== id) return setSel(id);
          navigate(id.startsWith('mv:') ? `/missions/${id.slice(3)}` : `/missions/india/${id}`);
        }}
      />
    </div>
  );
}

// ---------- Numbers ----------

function Numbers({ list }: { list: IndiaMission[] }) {
  const withStats = list.filter((m) => m.stats.length);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {withStats.map((m) => {
        const max = Math.max(...m.stats.map((s) => s.value));
        return (
          <div key={m.id} className="card p-4">
            <Link to={`/missions/india/${m.id}`} className="mb-3 block font-bold hover:text-accent">{m.title}</Link>
            <div className="space-y-2">
              {m.stats.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between gap-2 text-xs"><span className="text-ink-2">{s.label}{s.year ? ` (${s.year})` : ''}</span><span className="font-bold tabular-nums">{s.value.toLocaleString()}{s.unit ? ` ${s.unit}` : ''}</span></div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <motion.div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${SAFFRON}, ${GREEN})` }} initial={{ width: 0 }} animate={{ width: `${(s.value / max) * 100}%` }} transition={{ delay: i * 0.06, duration: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!withStats.length && <p className="text-muted">—</p>}
    </div>
  );
}

// ---------- Chapter page ----------

export function IndiaDetail() {
  const { id } = useParams();
  const a = useAtlas();
  const list = a.indiaMissions;
  const i = list.findIndex((m) => m.id === id);
  const m = list[i];
  const [sel, setSel] = useState<string | undefined>();
  if (!m) return <NotFound />;
  const c = chapterColour(i, list.length);
  const prev = list[i - 1];
  const next = list[i + 1];
  return (
    <article>
      <Link to="/missions/india" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Missions in India', 'இந்தியாவில் மிஷன் பணிகள்')}</Link>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: c }}>{L('Chapter', 'அத்தியாயம்')} {i + 1} · <span className="tabular-nums">{formatSpan(m.startYear, m.endYear)}</span> · {m.region}</div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold sm:text-4xl">{m.title}</h1>
          <BookmarkButton type="india" id={m.id} label={m.title} />
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{m.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ConfidenceBadge value={m.confidence} />
          {m.movementIds.map((mid) => {
            const mv = a.get<MissionMovement>('mission', mid);
            return mv ? <Link key={mid} to={`/missions/${mid}`} className="chip hover:!border-accent" style={{ color: STREAM_META[mv.stream].colour }}>{mv.name} · {statusLabel(mv.status)}</Link> : null;
          })}
        </div>
      </motion.header>

      {m.stations.length > 0 && (
        <div className="mb-6">
          <MissionMap focus="india" points={m.stations.map((s, k) => ({ id: `s${k}`, name: s.name + (s.year ? ` (${s.year})` : ''), lng: s.lng, lat: s.lat, colour: c, year: s.year, size: 5.5, label: true }))} selected={sel} onSelect={(_, id) => setSel(sel === id ? undefined : id)} />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 text-[17px] leading-relaxed text-ink-2">
          {m.story.split(/\n\s*\n/).map((p, k) => (
            <motion.p key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className={k === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{p}</motion.p>
          ))}
          <div className="rounded-xl border-l-4 bg-surface-2 p-4" style={{ borderColor: c }}>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('Legacy', 'மரபுரிமை')}</div>
            <p>{m.legacy}</p>
          </div>
        </div>
        <aside className="space-y-4">
          {m.stats.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 font-bold">{L('In numbers', 'எண்ணிக்கையில்')}</h3>
              {m.stats.map((s, k) => (
                <motion.div key={k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.07 }} className="mb-3">
                  <div className="text-2xl font-bold" style={{ color: c }}><CountUp to={s.value} />{s.unit ? <span className="ml-1 text-sm font-normal text-muted">{s.unit}</span> : null}</div>
                  <div className="text-xs text-muted">{s.label}{s.year ? ` · ${s.year}` : ''}</div>
                </motion.div>
              ))}
            </div>
          )}
          {m.groupsReached.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-2 font-bold">{L('Whom they reached', 'சென்றடைந்த மக்கள்')}</h3>
              <div className="flex flex-wrap gap-1">{m.groupsReached.map((g, k) => <span key={k} className="chip">{g}</span>)}</div>
            </div>
          )}
          {m.institutions.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-2 font-bold">{L('Institutions', 'நிறுவனங்கள்')}</h3>
              <ul className="space-y-1 text-sm text-ink-2">{m.institutions.map((x, k) => <li key={k}>• {x}</li>)}</ul>
            </div>
          )}
        </aside>
      </div>

      {m.people.length > 0 && <section className="mt-10"><h2 className="mb-3 text-xl font-bold">{L('Key people: focus and outcome', 'முக்கிய நபர்கள்: கவனமும் விளைவும்')}</h2><PeopleGrid people={m.people} colour={c} /></section>}

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <ListCard title={L('Focus', 'கவனம் செலுத்தியவை')} icon="compass" items={m.focus} colour={c} />
        <ListCard title={L('Strategies', 'உத்திகள்')} icon="layers" items={m.strategies} colour={NAVY} />
        <ListCard title={L('Challenges', 'சவால்கள்')} icon="hourglass" items={m.challenges} colour="#d07a1e" />
        <ListCard title={L('Harms and controversies', 'தீங்குகளும் சர்ச்சைகளும்')} icon="close" items={m.harms} colour="#c2453a" />
        <ListCard title={L('Outcomes', 'விளைவுகள்')} icon="check" items={m.outcomes} colour="#2e9d5b" />
      </section>

      <div className="mt-10"><Sources ids={m.sources} /></div>
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? <Link to={`/missions/india/${prev.id}`} className="card p-3 hover:text-accent">← {prev.title}</Link> : <span />}
        {next && <Link to={`/missions/india/${next.id}`} className="card p-3 text-right hover:text-accent">{next.title} →</Link>}
      </nav>
    </article>
  );
}
