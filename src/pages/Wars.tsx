import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Conflict } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { L } from '../data/missions';
import { KIND_META, ROLE_META, casualtyText, kindLabel, roleLabel, roleNote } from '../data/wars';
import { Icon } from '../components/Icon';
import { CountUp, PageHeader, Tabs, cx } from '../components/ui';
import { MissionMap, type MapPoint, type MapRoute } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GLane, type GNode } from '../viz/GraphFlow';

type View = 'bubbles' | 'map' | 'chain' | 'why' | 'cost' | 'peace';
const NOW = 2026;
/** Piecewise time scale: the first 1,000 years take 22% of the width. */
export const xYear = (y: number) => (y <= 1000 ? (y / 1000) * 22 : 22 + ((Math.min(y, NOW) - 1000) / (NOW - 1000)) * 78);
const ROLES: Conflict['religionRole'][] = ['central', 'major', 'contributing', 'pretext'];

export default function Wars() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'bubbles';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const [kind, setKind] = useState('');
  const list = useMemo(() => a.conflicts.filter((c) => !kind || c.kind === kind), [a, kind]);
  const kinds = useMemo(() => [...new Set(a.conflicts.map((c) => c.kind))], [a]);
  const central = a.conflicts.filter((c) => c.religionRole === 'central').length;
  const voices = a.conflicts.reduce((n, c) => n + c.dissenters.length, 0);
  const places = a.conflicts.reduce((n, c) => n + c.theatres.length, 0);

  return (
    <div>
      <PageHeader eyebrow={L('Explore', 'ஆராய்க')} icon="scales" title={L('Holy Wars & Conflicts', 'புனிதப் போர்களும் மோதல்களும்')}>
        {L(
          'Wars fought in the name of God, or in which Christian faith and identity were a real cause: from Constantine’s cross-marked shields through the Crusades and the wars of the Reformation to the conflicts of today. How religion was invoked, what else drove the fighting, the human cost, what changed afterwards, and the Christians who said no.',
          'கடவுளின் பெயரால் நடந்த போர்கள், அல்லது கிறிஸ்தவ விசுவாசமும் அடையாளமும் உண்மையான காரணமாக இருந்த மோதல்கள்: கான்ஸ்டன்டைனின் சிலுவைக் குறியிட்ட கேடயங்கள் முதல் சிலுவைப் போர்கள், சீர்திருத்தக் காலப் போர்கள், இன்றைய மோதல்கள் வரை. மதம் எவ்வாறு பயன்படுத்தப்பட்டது, போரை வேறு எவை தூண்டின, மனித இழப்பு, பின்னர் ஏற்பட்ட மாற்றங்கள், “வேண்டாம்” என்று சொன்ன கிறிஸ்தவர்கள்.',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [a.conflicts.length, L('conflicts', 'மோதல்கள்'), 'scales'],
          [central, L('with religion central', 'மதம் மையமாக இருந்தவை'), 'flame'],
          [places, L('battles & places mapped', 'வரைபடப் போர்க்களங்கள்'), 'map'],
          [voices, L('voices for peace', 'அமைதிக்கான குரல்கள்'), 'dove'],
        ] as const).map(([n, label, icon], i) => (
          <motion.div key={i} className="card p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Icon name={icon} className="mb-1 text-accent" />
            <div className="text-2xl font-bold text-ink"><CountUp to={n} /></div>
            <div className="text-xs text-muted">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="mb-4">
        <Tabs
          layoutId="wars-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'bubbles', label: L('Through the centuries', 'நூற்றாண்டுகளினூடே'), icon: 'timeline' },
            { id: 'map', label: L('Battle map', 'போர் வரைபடம்'), icon: 'map' },
            { id: 'chain', label: L('Chain reaction', 'தொடர் விளைவு'), icon: 'branch' },
            { id: 'why', label: L('Why they fought', 'ஏன் போரிட்டனர்'), icon: 'question' },
            { id: 'cost', label: L('Human cost', 'மனித இழப்பு'), icon: 'hourglass' },
            { id: 'peace', label: L('Voices for peace', 'அமைதிக்கான குரல்கள்'), icon: 'dove' },
          ]}
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !kind && '!border-accent !text-accent')} onClick={() => setKind('')}>{L('All', 'அனைத்தும்')}</button>
        {kinds.map((k) => (
          <button key={k} className={cx('chip cursor-pointer', kind === k && '!border-accent !text-accent')} onClick={() => setKind(kind === k ? '' : k)}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: KIND_META[k].colour }} /> {kindLabel(k)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {view === 'bubbles' && <Bubbles list={list} />}
          {view === 'map' && <BattleMap list={list} />}
          {view === 'chain' && <Chain list={list} />}
          {view === 'why' && <Why list={list} />}
          {view === 'cost' && <Cost list={list} />}
          {view === 'peace' && <Peace list={list} />}
        </motion.div>
      </AnimatePresence>

      <h2 className="mb-3 mt-10 text-xl font-bold">{L('All conflicts', 'அனைத்து மோதல்களும்')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c, i) => <ConflictCard key={c.id} c={c} i={i} />)}
      </div>
    </div>
  );
}

export function RoleMeter({ role, size = 'sm' }: { role: Conflict['religionRole']; size?: 'sm' | 'lg' }) {
  const m = ROLE_META[role];
  return (
    <div className={cx('flex items-center gap-1', size === 'lg' && 'gap-1.5')} title={`${L('Role of religion', 'மதத்தின் பங்கு')}: ${roleLabel(role)}`}>
      {[1, 2, 3, 4].map((n) => (
        <motion.span
          key={n}
          className={cx('rounded-sm', size === 'lg' ? 'h-4 w-6' : 'h-2 w-3')}
          style={{ background: n <= m.level ? m.colour : 'var(--line)' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: n * 0.08 }}
        />
      ))}
    </div>
  );
}

function ConflictCard({ c, i }: { c: Conflict; i: number }) {
  const k = KIND_META[c.kind];
  const cas = casualtyText(c.casualties);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
      <Link to={`/wars/${c.id}`} className="card group block h-full p-4 transition hover:-translate-y-1 hover:shadow-xl" style={{ borderTop: `4px solid ${k.colour}` }}>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="font-bold" style={{ color: k.colour }}>{kindLabel(c.kind)}</span>
          <span className="tabular-nums">{formatSpan(c.startYear, c.endYear)}</span>
        </div>
        <h3 className="mb-1 font-bold leading-snug text-ink group-hover:text-accent">{c.name}</h3>
        <p className="mb-3 line-clamp-3 text-sm text-ink-2">{c.summary}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">{L('Religion', 'மதம்')}: <RoleMeter role={c.religionRole} /></span>
          {cas && <span>☠ {cas}</span>}
        </div>
      </Link>
    </motion.div>
  );
}

// ---------- Bubble timeline ----------

function Bubbles({ list }: { list: Conflict[] }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<Conflict | null>(null);
  const maxDeaths = Math.max(1, ...list.map((c) => c.casualties.high ?? c.casualties.low ?? 0));
  const r = (c: Conflict) => 7 + Math.sqrt((c.casualties.high ?? c.casualties.low ?? 0) / maxDeaths) * 34;
  const W = 1000;
  const laneH = 92;
  const H = ROLES.length * laneH + 30;
  return (
    <div className="card overflow-hidden p-3">
      <div className="scrollbar-thin overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px]" role="img" aria-label={L('Conflicts through time', 'காலவரிசையில் மோதல்கள்')}>
          {ROLES.map((role, i) => (
            <g key={role}>
              <rect x={0} y={i * laneH} width={W} height={laneH} fill={i % 2 ? 'transparent' : 'var(--surface-2)'} opacity={0.6} />
              <text x={8} y={i * laneH + 16} className="text-[11px] font-bold" fill={ROLE_META[role].colour}>{L('Religion', 'மதம்')}: {roleLabel(role)}</text>
            </g>
          ))}
          {[300, 600, 1000, 1200, 1400, 1600, 1800, 2000].map((y) => (
            <g key={y}>
              <line x1={(xYear(y) / 100) * W} x2={(xYear(y) / 100) * W} y1={0} y2={H - 26} stroke="var(--line)" strokeDasharray="2 4" />
              <text x={(xYear(y) / 100) * W} y={H - 10} textAnchor="middle" className="fill-muted text-[10px]">{y}</text>
            </g>
          ))}
          {list.map((c, i) => {
            const lane = ROLES.indexOf(c.religionRole);
            const x = (xYear((c.startYear + (c.endYear ?? c.startYear)) / 2) / 100) * W;
            const y = lane * laneH + laneH / 2 + ((i % 3) - 1) * 14;
            const rad = r(c);
            const span = ((xYear(c.endYear ?? NOW) - xYear(c.startYear)) / 100) * W;
            return (
              <g key={c.id} className="cursor-pointer" onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onClick={() => navigate(`/wars/${c.id}`)}>
                <motion.line x1={(xYear(c.startYear) / 100) * W} x2={(xYear(c.startYear) / 100) * W + span} y1={y} y2={y} stroke={KIND_META[c.kind].colour} strokeWidth={3} strokeLinecap="round" opacity={0.45}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.03, duration: 0.6 }} />
                <motion.circle cx={x} cy={y} r={rad} fill={KIND_META[c.kind].colour} fillOpacity={hover?.id === c.id ? 0.9 : 0.55} stroke={KIND_META[c.kind].colour} strokeWidth={1.5}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 14 }} style={{ transformOrigin: `${x}px ${y}px` }} />
                {rad > 16 && <text x={x} y={y + 3} textAnchor="middle" className="pointer-events-none fill-white text-[9px] font-bold">{c.name.split(/[ (:]/)[0]}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 min-h-[64px] rounded-xl bg-surface-2 p-3 text-sm">
        {hover ? (
          <div>
            <b>{hover.name}</b> · <span className="tabular-nums">{formatSpan(hover.startYear, hover.endYear)}</span> · <span style={{ color: KIND_META[hover.kind].colour }}>{kindLabel(hover.kind)}</span>
            {casualtyText(hover.casualties) && <> · ☠ {casualtyText(hover.casualties)}</>}
            <div className="line-clamp-2 text-ink-2">{hover.summary}</div>
          </div>
        ) : (
          <span className="text-muted">{L('Each bubble is a conflict: its row shows how central religion was, its size the estimated death toll, the line its duration. Point at one to preview it; click to open.', 'ஒவ்வொரு குமிழியும் ஒரு மோதல்: அதன் வரிசை மதம் எவ்வளவு மையமாக இருந்தது என்பதையும், அளவு மதிப்பிடப்பட்ட உயிரிழப்பையும், கோடு கால அளவையும் காட்டுகிறது. முன்னோட்டத்துக்குச் சுட்டுங்கள்; திறக்கச் சொடுக்குங்கள்.')}</span>
        )}
      </div>
    </div>
  );
}

// ---------- Battle map ----------

function BattleMap({ list }: { list: Conflict[] }) {
  const navigate = useNavigate();
  const [year, setYear] = useState(NOW);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | undefined>();
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => { const n = y < 1000 ? y + 25 : y + 6; if (n >= NOW) { setPlaying(false); return NOW; } return n; }), 120);
    return () => clearInterval(id);
  }, [playing]);
  const routes: (MapRoute & { c: Conflict })[] = list.flatMap((c) => c.campaigns.map((j) => ({ id: j.id, title: `${j.title} (${formatYear(j.year)})`, colour: KIND_META[c.kind].colour, year: j.year, stops: j.stops, c })));
  const points: (MapPoint & { c: Conflict; text: string })[] = list.flatMap((c) => c.theatres.map((t, i) => ({ id: `${c.id}:${i}`, name: `${t.name}${t.year ? ` (${t.year})` : ''}`, lng: t.lng, lat: t.lat, colour: KIND_META[c.kind].colour, year: t.year ?? c.startYear, size: 4, c, text: c.name })));
  const cur = routes.find((r) => r.id === sel)?.c ?? points.find((p) => p.id === sel)?.c;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => { if (year >= NOW) setYear(300); setPlaying(!playing); }}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? L('Pause', 'நிறுத்து') : L('Play history', 'வரலாற்றை இயக்கு')}
          </button>
          <input type="range" min={300} max={NOW} value={year} onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} className="min-w-40 flex-1 accent-[var(--accent)]" aria-label={L('Year', 'ஆண்டு')} />
          <span className="w-24 text-right text-lg font-bold tabular-nums text-accent">{formatYear(year)}</span>
        </div>
        <MissionMap routes={routes} points={points} year={year} selected={sel} onSelect={(_, id) => setSel(sel === id ? undefined : id)} />
        <p className="mt-2 text-xs text-muted">{L('Pulsing dots are battles, sieges, massacres and treaties; lines are campaigns and voyages.', 'துடிக்கும் புள்ளிகள் போர்கள், முற்றுகைகள், படுகொலைகள், உடன்படிக்கைகள்; கோடுகள் படையெடுப்புகளும் கடற்பயணங்களும்.')}</p>
      </div>
      <div className="card max-h-[620px] overflow-y-auto p-4">
        {cur ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: KIND_META[cur.kind].colour }}>{kindLabel(cur.kind)} · {formatSpan(cur.startYear, cur.endYear)}</div>
            <h3 className="mt-1 text-lg font-bold">{cur.name}</h3>
            <div className="my-1 text-sm font-semibold">{routes.find((r) => r.id === sel)?.title ?? points.find((p) => p.id === sel)?.name}</div>
            <p className="text-sm text-ink-2">{routes.find((r) => r.id === sel)?.c.campaigns.find((j) => j.id === sel)?.text ?? cur.summary}</p>
            <button className="btn mt-3" onClick={() => navigate(`/wars/${cur.id}`)}>{L('Open', 'திற')} →</button>
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {list.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_META[c.kind].colour }} />
                <Link to={`/wars/${c.id}`} className={cx('hover:text-accent', c.startYear > year && 'opacity-40')}><span className="tabular-nums text-muted">{formatYear(c.startYear)}</span> {c.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Chain reaction ----------

function Chain({ list }: { list: Conflict[] }) {
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | undefined>();
  const g = useMemo(() => {
    const SPAN = 7000;
    const kinds = Object.keys(KIND_META).filter((k) => list.some((c) => c.kind === k)) as Conflict['kind'][];
    const nodes: GNode[] = [];
    const lanes: GLane[] = [];
    let y = 0;
    for (const k of kinds) {
      const cs = list.filter((c) => c.kind === k).sort((p, q) => p.startYear - q.startYear);
      const rows: number[] = [];
      const top = y;
      for (const c of cs) {
        const x = (xYear(c.startYear) / 100) * SPAN;
        let r = rows.findIndex((end) => x > end + 20);
        if (r < 0) { r = rows.length; rows.push(0); }
        rows[r] = x + 220;
        nodes.push({ id: c.id, label: c.name, sub: formatSpan(c.startYear, c.endYear), colour: KIND_META[k].colour, badge: roleLabel(c.religionRole), badgeColour: ROLE_META[c.religionRole].colour, x, y: top + r * 84 });
      }
      lanes.push({ y: top + ((rows.length - 1) * 84) / 2 + 20, label: kindLabel(k), colour: KIND_META[k].colour });
      y = top + rows.length * 84 + 30;
    }
    const ids = new Set(list.map((c) => c.id));
    const edges: GEdge[] = list.flatMap((c) => c.ledTo.filter((t) => ids.has(t)).map((t) => ({ from: c.id, to: t, colour: '#c0392b', label: L('led to', 'வழிவகுத்தது') })));
    return { nodes, edges, lanes, x0: (xYear(1050) / 100) * SPAN };
  }, [list]);
  const c = list.find((x) => x.id === sel);
  return (
    <div>
      <p className="mb-2 text-xs text-muted">{L('How one conflict fed the next. Time runs left to right; each row is a kind of conflict; the badge shows how central religion was. Click a box to highlight its links.', 'ஒரு மோதல் அடுத்ததற்கு எவ்வாறு வழிவகுத்தது. காலம் இடமிருந்து வலமாக; ஒவ்வொரு வரிசையும் ஒரு வகை மோதல்; முத்திரை மதத்தின் பங்கைக் காட்டுகிறது. இணைப்புகளைக் காண ஒரு பெட்டியைச் சொடுக்குங்கள்.')}</p>
      <GraphFlow nodes={g.nodes} edges={g.edges} lanes={g.lanes} view={{ x: -g.x0 * 0.5 + 40, y: 20, zoom: 0.5 }} selected={sel} onSelect={(id) => setSel(sel === id ? undefined : id)} height={640} />
      <AnimatePresence>
        {c && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mt-3 p-4">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{c.name}</h3><button className="btn ml-auto" onClick={() => navigate(`/wars/${c.id}`)}>{L('Open', 'திற')} →</button></div>
            <p className="text-sm text-ink-2">{c.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Why they fought ----------

function Why({ list }: { list: Conflict[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = [...list].sort((p, q) => ROLE_META[q.religionRole].level - ROLE_META[p.religionRole].level || p.startYear - q.startYear);
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        <span><b className="text-[#c0392b]">■</b> {L('religious causes', 'மதக் காரணங்கள்')}</span>
        <span><b className="text-[#2a8fb8]">■</b> {L('political, economic and other causes', 'அரசியல், பொருளாதார, பிற காரணங்கள்')}</span>
        <span><b className="text-[#d6a02a]">■</b> {L('triggers', 'தூண்டுதல்கள்')}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((c, i) => {
          const tot = Math.max(1, c.religiousCauses.length + c.otherCauses.length + c.triggers.length);
          const isOpen = open === c.id;
          return (
            <div key={c.id}>
              <button className="grid w-full grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-2 text-left text-xs hover:text-accent sm:grid-cols-[16rem_1fr_auto]" onClick={() => setOpen(isOpen ? null : c.id)}>
                <span className="truncate font-medium">{c.name}</span>
                <span className="flex h-4 overflow-hidden rounded-full bg-surface-2">
                  {[[c.religiousCauses.length, '#c0392b'], [c.otherCauses.length, '#2a8fb8'], [c.triggers.length, '#d6a02a']].map(([n, col], k) => (
                    <motion.span key={k} style={{ background: col as string }} initial={{ width: 0 }} animate={{ width: `${((n as number) / tot) * 100}%` }} transition={{ delay: i * 0.03 + k * 0.1, duration: 0.5 }} />
                  ))}
                </span>
                <RoleMeter role={c.religionRole} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="my-2 grid gap-3 rounded-xl bg-surface-2 p-3 text-sm md:grid-cols-3">
                      {([[L('Religious causes', 'மதக் காரணங்கள்'), c.religiousCauses, '#c0392b'], [L('Other causes', 'பிற காரணங்கள்'), c.otherCauses, '#2a8fb8'], [L('Triggers', 'தூண்டுதல்கள்'), c.triggers, '#d6a02a']] as const).map(([t, xs, col]) => (
                        <div key={t}><div className="mb-1 font-bold" style={{ color: col }}>{t}</div><ul className="space-y-1 text-ink-2">{xs.map((x, k) => <li key={k}>• {x}</li>)}</ul></div>
                      ))}
                      <p className="md:col-span-3"><b>{roleLabel(c.religionRole)}</b> — {c.religionRoleNote} <Link className="text-accent underline" to={`/wars/${c.id}`}>{L('Open', 'திற')} →</Link></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">{L('Bars show the share of listed causes of each kind (not a precise measure). The meter shows historians’ judgement of how central religion was:', 'பட்டைகள் ஒவ்வொரு வகைக் காரணங்களின் பங்கைக் காட்டுகின்றன (துல்லிய அளவீடு அல்ல). மதம் எவ்வளவு மையமாக இருந்தது என்ற வரலாற்றாசிரியர்களின் மதிப்பீட்டை அளவுமானி காட்டுகிறது:')} {ROLES.map((r) => `${roleLabel(r)} = ${roleNote(r)}`).join('; ')}.</p>
    </div>
  );
}

// ---------- Human cost ----------

function Cost({ list }: { list: Conflict[] }) {
  const rows = list.filter((c) => c.casualties.low || c.casualties.high).sort((p, q) => (q.casualties.high ?? q.casualties.low ?? 0) - (p.casualties.high ?? p.casualties.low ?? 0));
  const max = Math.log10(Math.max(10, ...rows.map((c) => c.casualties.high ?? c.casualties.low ?? 0)));
  const pos = (n: number) => (Math.log10(Math.max(n, 10)) - 1) / (max - 1) * 100;
  return (
    <div className="card p-4">
      <p className="mb-3 text-xs text-muted">{L('Estimated deaths (logarithmic scale). The bar spans the range scholars give; numbers for pre-modern wars are especially uncertain. Open a conflict to read the basis of each estimate.', 'மதிப்பிடப்பட்ட உயிரிழப்புகள் (மடக்கை அளவுகோல்). பட்டை அறிஞர்கள் தரும் வரம்பைக் காட்டுகிறது; நவீனத்துக்கு முந்தைய போர்களின் எண்ணிக்கைகள் மிகவும் நிச்சயமற்றவை. ஒவ்வொரு மதிப்பீட்டின் அடிப்படையையும் படிக்க மோதலைத் திறக்கவும்.')}</p>
      <div className="space-y-1.5">
        {rows.map((c, i) => {
          const lo = c.casualties.low ?? c.casualties.high!;
          const hi = c.casualties.high ?? c.casualties.low!;
          return (
            <Link key={c.id} to={`/wars/${c.id}`} className="grid grid-cols-[minmax(0,11rem)_1fr_6.5rem] items-center gap-2 text-xs hover:text-accent sm:grid-cols-[15rem_1fr_8rem]">
              <span className="truncate font-medium">{c.name}</span>
              <span className="relative h-4 rounded-full bg-surface-2">
                <motion.span className="absolute inset-y-0 rounded-full" style={{ left: `${pos(lo)}%`, background: KIND_META[c.kind].colour }} initial={{ width: 0 }} animate={{ width: `${Math.max(pos(hi) - pos(lo), 1.5)}%` }} transition={{ delay: i * 0.04, duration: 0.6 }} />
              </span>
              <span className="text-right tabular-nums text-muted">{casualtyText(c.casualties)}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between pl-[11rem] text-[10px] text-muted sm:pl-[15rem]"><span>10</span><span>1,000</span><span>100,000</span><span>10 {L('million', 'மில்லியன்')}</span></div>
    </div>
  );
}

// ---------- Voices for peace ----------

function Peace({ list }: { list: Conflict[] }) {
  const voices = list.flatMap((c) => c.dissenters.map((d) => ({ d, c })));
  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">{L('In almost every conflict some Christians refused the logic of holy war: preachers of peace, critics of atrocities, pacifist churches and peacemakers.', 'ஏறக்குறைய ஒவ்வொரு மோதலிலும் சில கிறிஸ்தவர்கள் புனிதப் போரின் நியாயத்தை மறுத்தனர்: அமைதியைப் போதித்தவர்கள், கொடுமைகளை விமர்சித்தவர்கள், வன்முறையற்ற சபைகள், சமாதானம் செய்தவர்கள்.')}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {voices.map(({ d, c }, i) => (
          <motion.div key={`${c.id}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 18) * 0.03 }} className="card relative overflow-hidden p-4">
            <motion.div className="absolute -right-3 -top-3 text-accent opacity-10" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 4 }}><Icon name="dove" size={64} /></motion.div>
            <div className="font-bold">{d.personId ? <Link to={`/people/${d.personId}`} className="hover:text-accent">{d.name}</Link> : d.name}</div>
            <Link to={`/wars/${c.id}`} className="text-xs text-accent hover:underline">{c.name}</Link>
            <p className="mt-2 text-sm text-ink-2">{d.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
