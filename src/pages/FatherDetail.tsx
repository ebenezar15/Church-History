import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { ChurchFather, Doctrine, PaganInfluence } from '../data/schema';
import { L } from '../data/missions';
import { LANG_META, ROOT_META, SCHOOL_META, VIEW_META, lbl, lifeSpan } from '../data/roots';
import { Icon } from '../components/Icon';
import { BookmarkButton, ConfidenceBadge, Sources, Tabs } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';
import { ListCard } from './MissionDetail';
import NotFound from './NotFound';

type Tab = 'story' | 'teach' | 'doctrine' | 'influence' | 'reception' | 'map';

export default function FatherDetail() {
  const { id } = useParams();
  const a = useAtlas();
  const navigate = useNavigate();
  const f = a.get<ChurchFather>('father', id!);
  const [tab, setTab] = useState<Tab>('story');
  const [root, setRoot] = useState(0);
  const chain = useMemo(() => (f ? lineage(f, a.fathers) : null), [f, a.fathers]);
  if (!f || !chain) return <NotFound />;
  const s = SCHOOL_META[f.school];
  const idx = a.fathers.findIndex((x) => x.id === f.id);
  const prev = a.fathers[idx - 1];
  const next = a.fathers[idx + 1];
  const influences = a.influences.filter((p: PaganInfluence) => p.fatherIds.includes(f.id) || [...p.defenders, ...p.critics].some((d) => d.fatherId === f.id));

  return (
    <article>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/fathers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Church Fathers', 'திருச்சபைப் பிதாக்கள்')}</Link>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: s.colour }}>
          <Icon name="quill" size={14} /> {lbl(s)} · <span className="tabular-nums">{lifeSpan(f)}</span> · {f.see.name} · <span style={{ color: LANG_META[f.language].colour }}>{lbl(LANG_META[f.language])}</span>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold sm:text-4xl">{f.name}</h1>
          <BookmarkButton type="father" id={f.id} label={f.name} />
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{f.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ConfidenceBadge value={f.confidence} />
          {f.roles.map((r, i) => <span key={i} className="chip">{r}</span>)}
          {f.personId && <Link to={`/people/${f.personId}`} className="chip hover:!border-accent hover:!text-accent"><Icon name="people" size={12} /> {L('Person profile', 'நபர் விவரம்')}</Link>}
        </div>
      </motion.header>

      {/* Roots: a constellation of influences around the Father */}
      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card p-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('Roots that shaped him', 'அவரை வடிவமைத்த வேர்கள்')}</div>
          <RootStar f={f} active={root} onPick={setRoot} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={root} className="card relative overflow-hidden p-5" style={{ borderLeft: `5px solid ${ROOT_META[f.roots[root].root].colour}` }} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            <Icon name="tree" size={90} className="absolute -right-4 -top-4 opacity-10" style={{ color: ROOT_META[f.roots[root].root].colour }} />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: ROOT_META[f.roots[root].root].colour }}>{root + 1} / {f.roots.length}</div>
            <div className="mb-2 text-xl font-bold">{lbl(ROOT_META[f.roots[root].root])}</div>
            <p className="leading-relaxed text-ink-2">{f.roots[root].text}</p>
            <div className="mt-3 flex gap-2">
              <button className="chip cursor-pointer" onClick={() => setRoot((root + f.roots.length - 1) % f.roots.length)}>←</button>
              <button className="chip cursor-pointer" onClick={() => setRoot((root + 1) % f.roots.length)}>→</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {f.quote && (
        <motion.blockquote className="card relative mb-6 overflow-hidden p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Icon name="quote" size={80} className="absolute -right-3 -top-3 text-accent opacity-10" />
          <p className="font-serif text-lg italic leading-relaxed text-ink">“{f.quote.text}”</p>
          <footer className="mt-2 text-sm text-muted">— {f.name}, <cite>{f.quote.citation}</cite></footer>
        </motion.blockquote>
      )}

      {chain.nodes.length > 1 && (
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 font-bold"><Icon name="branch" className="text-accent" /> {L('Teachers and heirs', 'ஆசிரியர்களும் வாரிசுகளும்')}</h2>
          <GraphFlow nodes={chain.nodes} edges={chain.edges} height={Math.max(280, chain.rows * 90 + 60)} selected={f.id} onSelect={(x) => x !== f.id && navigate(`/fathers/${x}`)} />
        </div>
      )}

      <div className="mb-5">
        <Tabs
          layoutId="father-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'story', label: L('Life', 'வாழ்க்கை'), icon: 'book' },
            { id: 'teach', label: L('Teachings & writings', 'போதனைகளும் நூல்களும்'), icon: 'scroll' },
            { id: 'doctrine', label: L('Doctrine', 'கோட்பாடு'), icon: 'trinity' },
            { id: 'influence', label: L('Later influence', 'பிற்காலத் தாக்கம்'), icon: 'arrow' },
            { id: 'reception', label: L('How churches see him', 'சபைகள் அவரைக் காணும் விதம்'), icon: 'scales' },
            { id: 'map', label: L('Map', 'வரைபடம்'), icon: 'map' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'story' && (
            <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-ink-2">
              {f.story.split(/\n\s*\n/).map((p, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{p}</motion.p>
              ))}
              {f.controversies.length > 0 && <ListCard title={L('Controversies', 'சர்ச்சைகள்')} icon="flame" items={f.controversies} colour="#d07a1e" />}
            </div>
          )}
          {tab === 'teach' && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('Key teachings', 'முக்கியப் போதனைகள்')} icon="lamp" items={f.keyTeachings} colour={s.colour} />
              <div className="card p-4" style={{ borderTop: '4px solid #7a4fc2' }}>
                <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="book" style={{ color: '#7a4fc2' }} /> {L('Writings', 'நூல்கள்')}</h3>
                <ol className="relative ml-2 border-l-2 border-line pl-5">
                  {f.works.map((w, i) => (
                    <motion.li key={i} className="relative mb-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 bg-surface" style={{ borderColor: '#7a4fc2' }} />
                      <div className="font-semibold">{w.workId ? <Link to={`/library/${w.workId}`} className="text-accent underline">{w.title}</Link> : <i>{w.title}</i>}{w.year ? <span className="ml-2 text-xs tabular-nums text-muted">{w.year}</span> : null}</div>
                      <p className="text-sm text-ink-2">{w.note}</p>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {tab === 'doctrine' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {f.doctrineContributions.map((d, i) => (
                <motion.div key={i} className="card p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
                  <Link to={`/doctrines/${d.doctrineId}`} className="mb-1 flex items-center gap-2 font-bold text-accent"><Icon name="trinity" size={16} /> {a.get<Doctrine>('doctrine', d.doctrineId)?.name ?? d.doctrineId}</Link>
                  <p className="text-sm text-ink-2">{d.text}</p>
                </motion.div>
              ))}
              {!f.doctrineContributions.length && <p className="text-muted">—</p>}
            </div>
          )}
          {tab === 'influence' && (
            <div className="max-w-3xl">
              {f.laterInfluence.map((x, i) => (
                <motion.div key={i} className="flex gap-3" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: s.colour }}>{i + 1}</span>
                    {i < f.laterInfluence.length - 1 && <motion.span className="w-0.5 flex-1" style={{ background: s.colour }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.08 + 0.1 }} />}
                  </div>
                  <div className="pb-5">
                    <div className="font-bold">{x.on}</div>
                    <p className="text-ink-2">{x.text}</p>
                  </div>
                </motion.div>
              ))}
              {influences.length > 0 && (
                <div className="card mt-2 p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{L('In the pagan-influence debates', 'பிற மதத் தாக்க விவாதங்களில்')}</div>
                  <div className="flex flex-wrap gap-2">{influences.map((p) => <Link key={p.id} to={`/influences/${p.id}`} className="chip hover:!border-accent hover:!text-accent"><Icon name="sun" size={12} /> {p.name}</Link>)}</div>
                </div>
              )}
            </div>
          )}
          {tab === 'reception' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {f.reception.map((r, i) => (
                <motion.div key={i} className="card p-4" style={{ borderTop: `4px solid ${VIEW_META[r.view].colour}` }} initial={{ opacity: 0, rotateY: 80 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{r.tradition}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: VIEW_META[r.view].colour }}>{lbl(VIEW_META[r.view])}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{r.text}</p>
                </motion.div>
              ))}
            </div>
          )}
          {tab === 'map' && (
            <MissionMap
              focus={{ lng: [-12, 58], lat: [22, 52] }}
              routes={f.places.length > 1 ? [{ id: f.id, title: f.name, colour: s.colour, year: f.born ?? 0, stops: [...f.places].sort((p, q) => (p.year ?? 0) - (q.year ?? 0)) }] : []}
              points={f.places.map((p, i) => ({ id: `p${i}`, name: `${p.name}${p.year ? ` (${p.year})` : ''}`, lng: p.lng, lat: p.lat, colour: s.colour, size: 5, label: true }))}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10"><Sources ids={f.sources} /></div>
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? <button onClick={() => navigate(`/fathers/${prev.id}`)} className="card p-3 text-left hover:text-accent">← {prev.name}</button> : <span />}
        {next && <button onClick={() => navigate(`/fathers/${next.id}`)} className="card p-3 text-right hover:text-accent">{next.name} →</button>}
      </nav>
    </article>
  );
}

/** The Father at the centre with his roots as rays around him. */
function RootStar({ f, active, onPick }: { f: ChurchFather; active: number; onPick: (i: number) => void }) {
  const n = f.roots.length;
  const R = 108;
  return (
    <svg viewBox="-170 -140 340 280" className="mx-auto w-full max-w-md">
      {f.roots.map((r, i) => {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(ang) * R, y = Math.sin(ang) * R;
        const c = ROOT_META[r.root].colour;
        const label = lbl(ROOT_META[r.root]);
        return (
          <g key={i} onClick={() => onPick(i)} className="cursor-pointer">
            <motion.line x1={0} y1={0} x2={x} y2={y} stroke={c} strokeWidth={i === active ? 4 : 2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }} />
            <motion.circle cx={x} cy={y} r={i === active ? 13 : 9} fill={c} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08, type: 'spring' }} />
            <text x={x} y={y + (y >= 0 ? 26 : -18)} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-semibold">{label.length > 22 ? `${label.slice(0, 21)}…` : label}</text>
          </g>
        );
      })}
      <motion.circle r={34} fill="var(--surface)" stroke={SCHOOL_META[f.school].colour} strokeWidth={3} initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} />
      <motion.circle r={42} fill="none" stroke={SCHOOL_META[f.school].colour} strokeOpacity={0.4} animate={{ r: [38, 48, 38], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 2.6 }} />
      <foreignObject x={-32} y={-14} width={64} height={28}>
        <div className="flex h-full items-center justify-center text-center text-[10px] font-bold leading-tight text-ink">{f.name.split(/\s+/).slice(0, 2).join(' ')}</div>
      </foreignObject>
    </svg>
  );
}

/** Teachers (two generations) → this Father → pupils (two generations). */
function lineage(f: ChurchFather, all: ChurchFather[]) {
  const by = new Map(all.map((x) => [x.id, x]));
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const add = (x: ChurchFather) => nodes.set(x.id, { id: x.id, label: x.name, sub: `${lbl(SCHOOL_META[x.school])} · ${lifeSpan(x)}`, colour: SCHOOL_META[x.school].colour, title: x.summary });
  add(f);
  const up = (x: ChurchFather, depth: number) => {
    for (const t of x.teachers) { const tf = by.get(t); if (!tf) continue; add(tf); edges.push({ from: t, to: x.id, colour: SCHOOL_META[tf.school].colour }); if (depth > 1) up(tf, depth - 1); }
  };
  const down = (x: ChurchFather, depth: number) => {
    for (const p of all.filter((y) => y.teachers.includes(x.id))) { add(p); edges.push({ from: x.id, to: p.id, colour: SCHOOL_META[x.school].colour }); if (depth > 1) down(p, depth - 1); }
  };
  up(f, 2);
  down(f, 2);
  const uniq = [...new Map(edges.map((e) => [`${e.from}>${e.to}`, e])).values()];
  const rows = Math.max(1, ...[...nodes.keys()].map((k) => uniq.filter((e) => e.to === k).length), uniq.filter((e) => e.from === f.id).length);
  return { nodes: [...nodes.values()], edges: uniq, rows };
}
