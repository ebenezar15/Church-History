import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Conflict } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { L } from '../data/missions';
import { KIND_META, ROLE_META, casualtyText, kindLabel, roleLabel, roleNote } from '../data/wars';
import { Icon } from '../components/Icon';
import { BookmarkButton, ConfidenceBadge, EntityChips, Sources, Tabs, TraditionChip } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GLane, type GNode } from '../viz/GraphFlow';
import { ListCard, PeopleGrid } from './MissionDetail';
import NotFound from './NotFound';

type Tab = 'story' | 'flow' | 'timeline' | 'people' | 'effects' | 'peace';
const SIDE_COLOURS = ['#c0392b', '#2a8fb8', '#7a4fc2', '#2e9d5b'];
const clip = (s: string, n = 110) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s);

export default function WarDetail() {
  const { id } = useParams();
  const a = useAtlas();
  const navigate = useNavigate();
  const c = a.get<Conflict>('conflict', id!);
  const [tab, setTab] = useState<Tab>('story');
  const [sel, setSel] = useState<string | undefined>();
  const flow = useMemo(() => (c ? causeEffect(c) : null), [c]);
  if (!c || !flow) return <NotFound />;
  const k = KIND_META[c.kind];
  const idx = a.conflicts.findIndex((x) => x.id === c.id);
  const prev = a.conflicts[idx - 1];
  const next = a.conflicts[idx + 1];
  const causedBy = a.conflicts.filter((x) => x.ledTo.includes(c.id));
  const cas = casualtyText(c.casualties);

  return (
    <article>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/wars" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Holy Wars & Conflicts', 'புனிதப் போர்களும் மோதல்களும்')}</Link>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: k.colour }}>
          <Icon name={k.icon} size={14} /> {kindLabel(c.kind)} · <span className="tabular-nums">{formatSpan(c.startYear, c.endYear)}</span> · {c.region}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold sm:text-4xl">{c.name}</h1>
          <BookmarkButton type="conflict" id={c.id} label={c.name} />
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{c.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ConfidenceBadge value={c.confidence} />
          {c.traditionIds.map((t) => <TraditionChip key={t} id={t} />)}
        </div>
      </motion.header>

      {/* Sides: an animated "versus" banner */}
      <div className={`mb-6 grid items-stretch gap-3 ${c.sides.length === 2 ? 'sm:grid-cols-[1fr_auto_1fr]' : c.sides.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {c.sides.flatMap((s, i) => {
          const card = (
            <motion.div key={`s${i}`} className="card min-w-0 p-4" style={{ borderTop: `5px solid ${SIDE_COLOURS[i % 4]}` }}
              initial={{ opacity: 0, x: i === 0 ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 140, damping: 16 }}>
              <div className="text-lg font-bold" style={{ color: SIDE_COLOURS[i % 4] }}>{s.name}</div>
              <div className="text-sm text-muted">{s.faith}</div>
              {s.leaders.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.leaders.map((l, j) => <span key={j} className="chip">{l}</span>)}</div>}
            </motion.div>
          );
          return c.sides.length === 2 && i === 1
            ? [<motion.div key="vs" className="flex items-center justify-center text-2xl font-black text-accent" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.4 }}>VS</motion.div>, card]
            : [card];
        })}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Gauge c={c} />
        <motion.blockquote className="card relative overflow-hidden p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Icon name="cross" size={90} className="absolute -right-4 -top-4 text-accent opacity-10" />
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{L('In the name of God', 'கடவுளின் பெயரால்')}</div>
          <p className="font-serif text-lg italic leading-relaxed text-ink">{c.nameOfGod}</p>
        </motion.blockquote>
      </div>

      {cas && (
        <motion.div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-3xl">☠</div>
          <div>
            <div className="text-2xl font-bold text-ink">{cas}</div>
            <div className="text-xs text-muted">{L('estimated deaths', 'மதிப்பிடப்பட்ட உயிரிழப்புகள்')}</div>
          </div>
          <p className="min-w-0 flex-1 text-sm text-ink-2">{c.casualties.note}</p>
        </motion.div>
      )}

      {(c.theatres.length > 0 || c.campaigns.length > 0) && (
        <div className="mb-6">
          <MissionMap
            routes={c.campaigns.map((j) => ({ id: j.id, title: j.title, colour: k.colour, year: j.year, stops: j.stops }))}
            points={c.theatres.map((t, i) => ({ id: `t${i}`, name: `${t.name}${t.year ? ` (${t.year})` : ''}`, lng: t.lng, lat: t.lat, colour: SIDE_COLOURS[0], year: t.year, size: 4.5, label: c.theatres.length <= 12 }))}
            selected={sel}
            onSelect={(_, sid) => setSel(sel === sid ? undefined : sid)}
          />
        </div>
      )}

      <div className="mb-5">
        <Tabs
          layoutId="war-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'story', label: L('Story', 'வரலாறு'), icon: 'book' },
            { id: 'flow', label: L('Causes → effects', 'காரணங்கள் → விளைவுகள்'), icon: 'branch' },
            { id: 'timeline', label: L('Timeline', 'காலவரிசை'), icon: 'timeline' },
            { id: 'people', label: L('Key people', 'முக்கிய நபர்கள்'), icon: 'people' },
            { id: 'effects', label: L('Effects', 'விளைவுகள்'), icon: 'layers' },
            { id: 'peace', label: L('Voices against', 'எதிர்த்த குரல்கள்'), icon: 'dove' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'story' && (
            <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-ink-2">
              {c.story.split(/\n\s*\n/).map((p, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{p}</motion.p>
              ))}
              <div className="rounded-xl border-l-4 bg-surface-2 p-4" style={{ borderColor: k.colour }}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('Legacy', 'மரபுரிமை')}</div>
                <p>{c.legacy}</p>
              </div>
            </div>
          )}
          {tab === 'flow' && (
            <div>
              <p className="mb-2 text-sm text-muted">{L('What fed the war (left) and what it left behind (right). Point at a box to read it in full.', 'போரைத் தூண்டியவை (இடது), அது விட்டுச்சென்றவை (வலது). முழுமையாகப் படிக்க ஒரு பெட்டியைச் சுட்டுங்கள்.')}</p>
              <GraphFlow nodes={flow.nodes} edges={flow.edges} lanes={flow.lanes} height={Math.max(460, flow.height * 0.62 + 80)} />
            </div>
          )}
          {tab === 'timeline' && (
            <ol className="relative ml-2 max-w-3xl border-l-2 pl-6" style={{ borderColor: k.colour }}>
              {c.timeline.map((e, i) => (
                <motion.li key={i} className="relative mb-4" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-surface" style={{ borderColor: k.colour }} />
                  <div className="text-sm font-bold tabular-nums" style={{ color: k.colour }}>{formatYear(e.year)}</div>
                  <p className="text-ink-2">{e.text}</p>
                </motion.li>
              ))}
            </ol>
          )}
          {tab === 'people' && <PeopleGrid people={c.keyPeople} colour={k.colour} />}
          {tab === 'effects' && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('Effects on the world', 'உலகின் மீதான விளைவுகள்')} icon="globe" items={c.effects} colour="#2a8fb8" />
              <ListCard title={L('Effects on the church', 'திருச்சபையின் மீதான விளைவுகள்')} icon="cross" items={c.effectsOnChurch} colour="#7a4fc2" />
              {(c.ledTo.length > 0 || causedBy.length > 0) && (
                <div className="card p-4 md:col-span-2">
                  {causedBy.length > 0 && <p className="mb-2 text-sm"><b>{L('Grew out of', 'இதிலிருந்து உருவானது')}:</b> {causedBy.map((x, i) => <span key={x.id}>{i > 0 && ', '}<Link className="text-accent underline" to={`/wars/${x.id}`}>{x.name}</Link></span>)}</p>}
                  {c.ledTo.length > 0 && <p className="text-sm"><b>{L('Led to', 'வழிவகுத்தது')}:</b> {c.ledTo.map((t, i) => <span key={t}>{i > 0 && ', '}<Link className="text-accent underline" to={`/wars/${t}`}>{a.get<Conflict>('conflict', t)?.name ?? t}</Link></span>)}</p>}
                </div>
              )}
              {c.eventIds.length > 0 && <div className="md:col-span-2"><h3 className="mb-2 font-bold">{L('Related events', 'தொடர்புடைய நிகழ்வுகள்')}</h3><EntityChips type="event" ids={c.eventIds} /></div>}
            </div>
          )}
          {tab === 'peace' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {c.dissenters.map((d, i) => (
                <motion.div key={i} className="card relative overflow-hidden p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Icon name="dove" size={60} className="absolute -right-2 -top-2 text-accent opacity-10" />
                  <div className="font-bold">{d.personId ? <Link to={`/people/${d.personId}`} className="hover:text-accent">{d.name}</Link> : d.name}</div>
                  <p className="mt-1 text-sm text-ink-2">{d.text}</p>
                </motion.div>
              ))}
              {!c.dissenters.length && <p className="text-muted">—</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10"><Sources ids={c.sources} /></div>
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? <button onClick={() => navigate(`/wars/${prev.id}`)} className="card p-3 text-left hover:text-accent">← {prev.name}</button> : <span />}
        {next && <button onClick={() => navigate(`/wars/${next.id}`)} className="card p-3 text-right hover:text-accent">{next.name} →</button>}
      </nav>
    </article>
  );
}

/** A semicircular gauge: how central religion was to this conflict. */
function Gauge({ c }: { c: Conflict }) {
  const m = ROLE_META[c.religionRole];
  const angle = -90 + (m.level - 0.5) * 45;
  const segs = (['pretext', 'contributing', 'major', 'central'] as const).map((r, i) => {
    const a0 = Math.PI * (1 - i / 4);
    const a1 = Math.PI * (1 - (i + 1) / 4);
    const p = (ang: number, rad: number) => `${100 + rad * Math.cos(ang)},${100 - rad * Math.sin(ang)}`;
    return { r, d: `M${p(a0, 90)} A90,90 0 0 1 ${p(a1, 90)} L${p(a1, 58)} A58,58 0 0 0 ${p(a0, 58)} Z` };
  });
  return (
    <div className="card p-4">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('How central was religion?', 'மதம் எவ்வளவு மையமாக இருந்தது?')}</div>
      <svg viewBox="0 0 200 112" className="mx-auto w-full max-w-xs">
        {segs.map((s, i) => (
          <motion.path key={s.r} d={s.d} fill={ROLE_META[s.r].colour} opacity={s.r === c.religionRole ? 1 : 0.25} initial={{ opacity: 0 }} animate={{ opacity: s.r === c.religionRole ? 1 : 0.25 }} transition={{ delay: i * 0.1 }} />
        ))}
        <motion.g initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 60, damping: 9, delay: 0.3 }} style={{ originX: '100px', originY: '100px' }}>
          <line x1={100} y1={100} x2={100} y2={22} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
        </motion.g>
        <circle cx={100} cy={100} r={7} fill="var(--ink)" />
      </svg>
      <div className="text-center text-lg font-bold" style={{ color: m.colour }}>{roleLabel(c.religionRole)}</div>
      <div className="text-center text-xs text-muted">{roleNote(c.religionRole)}</div>
      <p className="mt-2 text-sm text-ink-2">{c.religionRoleNote}</p>
    </div>
  );
}

/** Causes (religious, other, triggers) → the conflict → effects (world, church), as a positioned flowchart. */
function causeEffect(c: Conflict): { nodes: GNode[]; edges: GEdge[]; lanes: GLane[]; height: number } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const GAP = 96;
  const col = (items: string[], prefix: string, colour: string, sub: string, x: number, y0: number) =>
    items.map((t, i) => { const id = `${prefix}${i}`; nodes.push({ id, label: clip(t), title: t, sub, colour, x, y: y0 + i * GAP }); return id; });
  const left = [
    ...col(c.religiousCauses, 'r', '#c0392b', L('Religious cause', 'மதக் காரணம்'), 0, 0),
  ];
  const otherY = c.religiousCauses.length * GAP + 30;
  left.push(...col(c.otherCauses, 'o', '#2a8fb8', L('Other cause', 'பிற காரணம்'), 0, otherY));
  const trigY = otherY + c.otherCauses.length * GAP + 30;
  left.push(...col(c.triggers, 'g', '#d6a02a', L('Trigger', 'தூண்டுதல்'), 0, trigY));
  const leftH = trigY + c.triggers.length * GAP;
  const right = [...col(c.effects, 'e', '#2e9d5b', L('Effect', 'விளைவு'), 640, 0)];
  const chY = c.effects.length * GAP + 30;
  right.push(...col(c.effectsOnChurch, 'c', '#7a4fc2', L('Effect on the church', 'திருச்சபை மீதான விளைவு'), 640, chY));
  const rightH = chY + c.effectsOnChurch.length * GAP;
  const height = Math.max(leftH, rightH);
  nodes.push({ id: 'war', label: c.name, sub: formatSpan(c.startYear, c.endYear), colour: KIND_META[c.kind].colour, badge: roleLabel(c.religionRole), badgeColour: ROLE_META[c.religionRole].colour, x: 320, y: height / 2 - 30 });
  for (const id of left) edges.push({ from: id, to: 'war', colour: nodes.find((n) => n.id === id)!.colour });
  for (const id of right) edges.push({ from: 'war', to: id, colour: nodes.find((n) => n.id === id)!.colour });
  return { nodes, edges, lanes: [], height };
}
