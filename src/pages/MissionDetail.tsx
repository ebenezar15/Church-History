import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { MissionMovement, MissionPerson } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { L, RELATION_META, STATUS_META, STREAM_META, relationLabel, statusLabel, streamLabel } from '../data/missions';
import { Icon, type IconName } from '../components/Icon';
import { BookmarkButton, ConfidenceBadge, Sources, Tabs, TraditionChip, cx } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';
import NotFound from './NotFound';

type Tab = 'story' | 'methods' | 'people' | 'places' | 'costs' | 'relations';

export default function MissionDetail() {
  const { id } = useParams();
  const a = useAtlas();
  const m = a.get<MissionMovement>('mission', id!);
  const [tab, setTab] = useState<Tab>('story');
  const [sel, setSel] = useState<string | undefined>();
  if (!m) return <NotFound />;
  const c = STREAM_META[m.stream].colour;
  const s = STATUS_META[m.status];
  const idx = a.missions.findIndex((x) => x.id === m.id);
  const prev = a.missions[idx - 1];
  const next = a.missions[idx + 1];

  return (
    <article>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/missions" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Missions', 'மிஷன் பணிகள்')}</Link>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: c }}>
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {streamLabel(m.stream)} · <span className="tabular-nums">{formatSpan(m.startYear, m.endYear)}</span> · {m.origin.name}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold sm:text-4xl">{m.name}</h1>
          <BookmarkButton type="mission" id={m.id} label={m.name} />
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{m.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <motion.span className="chip font-semibold" style={{ color: s.colour, borderColor: s.colour }} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>{s.mark} {statusLabel(m.status)}</motion.span>
          <ConfidenceBadge value={m.confidence} />
          {m.traditionIds.map((t) => <TraditionChip key={t} id={t} />)}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted">{m.statusNote}</p>
      </motion.header>

      {(m.journeys.length > 0 || m.countries.length > 0) && (
        <div className="mb-6">
          <MissionMap
            routes={m.journeys.map((j) => ({ id: j.id, title: j.title, colour: c, year: j.year, stops: j.stops }))}
            points={m.countries.map((x, i) => ({ id: `c${i}`, name: x.country, lng: x.lng, lat: x.lat, colour: c, year: x.year, size: 4, label: m.countries.length <= 14 }))}
            selected={sel}
            onSelect={(_, id) => { setSel(sel === id ? undefined : id); setTab('places'); }}
          />
        </div>
      )}

      <div className="mb-5">
        <Tabs
          layoutId="mission-detail-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'story', label: L('Story', 'வரலாறு'), icon: 'book' },
            { id: 'methods', label: L('Beliefs & strategies', 'நம்பிக்கைகளும் உத்திகளும்'), icon: 'compass' },
            { id: 'people', label: L('Key people', 'முக்கிய நபர்கள்'), icon: 'people' },
            { id: 'places', label: L('Journeys & countries', 'பயணங்களும் நாடுகளும்'), icon: 'map' },
            { id: 'costs', label: L('Challenges, harms & results', 'சவால்கள், தீங்குகள், விளைவுகள்'), icon: 'scales' },
            { id: 'relations', label: L('Connections', 'தொடர்புகள்'), icon: 'branch' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'story' && (
            <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-ink-2">
              {m.story.split(/\n\s*\n/).map((p, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{p}</motion.p>
              ))}
              <div className="rounded-xl border-l-4 bg-surface-2 p-4" style={{ borderColor: c }}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('Outcome', 'விளைவு')}</div>
                <p>{m.outcome}</p>
              </div>
            </div>
          )}
          {tab === 'methods' && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('What they believed', 'அவர்களின் நம்பிக்கைகள்')} icon="book" items={m.beliefs} colour={c} />
              <ListCard title={L('Strategies they used', 'பயன்படுத்திய உத்திகள்')} icon="compass" items={m.strategies} colour={c} />
              <ListCard title={L('Whom they reached', 'சென்றடைந்த மக்கள்')} icon="people" items={m.groupsReached} colour={c} />
              {m.deviations.length > 0 && <ListCard title={L('Where they deviated', 'விலகிய இடங்கள்')} icon="split" items={m.deviations} colour="#d07a1e" />}
            </div>
          )}
          {tab === 'people' && <PeopleGrid people={m.keyPeople} colour={c} />}
          {tab === 'places' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 font-bold">{L('Journeys', 'பயணங்கள்')}</h3>
                <div className="space-y-3">
                  {m.journeys.map((j, i) => (
                    <motion.button key={j.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSel(sel === j.id ? undefined : j.id)}
                      className={cx('card block w-full p-3 text-left transition hover:shadow-lg', sel === j.id && 'ring-2 ring-accent')}>
                      <div className="text-xs tabular-nums text-muted">{formatSpan(j.year, j.endYear)} · {j.people}</div>
                      <div className="font-bold">{j.title}</div>
                      <div className="my-1 flex flex-wrap items-center gap-1 text-xs text-ink-2">
                        {j.stops.map((st, k) => <span key={k} className="flex items-center gap-1">{k > 0 && <span style={{ color: c }}>→</span>}{st.name}</span>)}
                      </div>
                      <p className="text-sm text-ink-2">{j.text}</p>
                    </motion.button>
                  ))}
                  {!m.journeys.length && <p className="text-sm text-muted">—</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-bold">{L('Countries and regions', 'நாடுகளும் பகுதிகளும்')}</h3>
                <ol className="relative space-y-3 border-l-2 pl-5" style={{ borderColor: c }}>
                  {[...m.countries].sort((p, q) => p.year - q.year).map((x, i) => (
                    <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 bg-surface" style={{ borderColor: c }} />
                      <div className="text-xs font-bold tabular-nums text-muted">{formatYear(x.year)}</div>
                      <div className="font-semibold">{x.country}</div>
                      <p className="text-sm text-ink-2">{x.text}</p>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {tab === 'costs' && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('Challenges they faced', 'எதிர்கொண்ட சவால்கள்')} icon="hourglass" items={m.challenges} colour="#d07a1e" />
              <ListCard title={L('Harms and failures', 'தீங்குகளும் தோல்விகளும்')} icon="close" items={m.harms} colour="#c2453a" />
              <ListCard title={L('Lasting contributions', 'நிலைத்த பங்களிப்புகள்')} icon="check" items={m.developments} colour="#2e9d5b" />
              <div className="card p-4" style={{ borderTop: `4px solid ${s.colour}` }}>
                <h3 className="mb-2 flex items-center gap-2 font-bold"><Icon name={s.icon} style={{ color: s.colour }} /> {statusLabel(m.status)}</h3>
                <p className="text-sm text-ink-2">{m.statusNote}</p>
                <p className="mt-2 text-sm text-ink-2">{m.outcome}</p>
              </div>
            </div>
          )}
          {tab === 'relations' && <Relations m={m} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10"><Sources ids={m.sources} /></div>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? <Link to={`/missions/${prev.id}`} className="card p-3 hover:text-accent">← {prev.name}</Link> : <span />}
        {next && <Link to={`/missions/${next.id}`} className="card p-3 text-right hover:text-accent">{next.name} →</Link>}
      </nav>
    </article>
  );
}

export function ListCard({ title, icon, items, colour }: { title: string; icon: IconName; items: string[]; colour: string }) {
  if (!items.length) return null;
  return (
    <div className="card p-4" style={{ borderTop: `4px solid ${colour}` }}>
      <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name={icon} style={{ color: colour }} /> {title}</h3>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-2 text-sm leading-relaxed text-ink-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colour }} /> {t}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function PeopleGrid({ people, colour }: { people: MissionPerson[]; colour: string }) {
  const a = useAtlas();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p, i) => {
        const initials = p.name.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
        const linked = p.personId && a.get('person', p.personId);
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(i, 12) * 0.05 }} className="card p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: colour }}>{initials}</div>
              <div className="min-w-0">
                {linked ? <Link to={`/people/${p.personId}`} className="font-bold hover:text-accent">{p.name}</Link> : <div className="font-bold">{p.name}</div>}
                <div className="text-xs text-muted">{p.years}{p.origin ? ` · ${p.origin}` : ''}</div>
              </div>
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: colour }}>{p.role}</div>
            <p className="text-sm text-ink-2"><b>{L('Focus', 'கவனம்')}:</b> {p.focus}</p>
            {p.outcome && <p className="mt-1 text-sm text-ink-2"><b>{L('Outcome', 'விளைவு')}:</b> {p.outcome}</p>}
          </motion.div>
        );
      })}
    </div>
  );
}

function Relations({ m }: { m: MissionMovement }) {
  const a = useAtlas();
  const navigate = useNavigate();
  const g = useMemo(() => {
    const ids = new Set<string>([m.id, ...m.influencedBy, ...m.relations.map((r) => r.to)]);
    for (const o of a.missions) if (o.influencedBy.includes(m.id) || o.relations.some((r) => r.to === m.id)) ids.add(o.id);
    const list = a.missions.filter((x) => ids.has(x.id));
    const nodes: GNode[] = list.map((x) => ({ id: x.id, label: x.name, sub: formatSpan(x.startYear, x.endYear), colour: STREAM_META[x.stream].colour, badge: STATUS_META[x.status].mark, badgeColour: STATUS_META[x.status].colour }));
    const edges: GEdge[] = [];
    for (const x of list) {
      for (const r of x.relations) if (ids.has(r.to)) edges.push({ from: x.id, to: r.to, colour: RELATION_META[r.kind].colour, dashed: RELATION_META[r.kind].dashed, label: relationLabel(r.kind) });
      for (const f of x.influencedBy) if (ids.has(f)) edges.push({ from: f, to: x.id, colour: 'var(--muted)', dashed: true });
    }
    return { nodes, edges };
  }, [a, m]);
  const name = (id: string) => a.get<MissionMovement>('mission', id)?.name ?? id;
  return (
    <div className="space-y-5">
      {g.nodes.length > 1 && <GraphFlow nodes={g.nodes} edges={g.edges} selected={m.id} onSelect={(id) => id !== m.id && navigate(`/missions/${id}`)} height={420} />}
      <div className="grid gap-4 md:grid-cols-2">
        {m.relations.length > 0 && (
          <div className="card p-4">
            <h3 className="mb-2 font-bold">{L('What it led to', 'இது வழிவகுத்தவை')}</h3>
            {m.relations.map((r, i) => <p key={i} className="mb-2 text-sm"><b style={{ color: RELATION_META[r.kind].colour }}>{relationLabel(r.kind)}</b> <Link className="text-accent underline" to={`/missions/${r.to}`}>{name(r.to)}</Link> — {r.text}</p>)}
          </div>
        )}
        {m.influencedBy.length > 0 && (
          <div className="card p-4">
            <h3 className="mb-2 font-bold">{L('Inspired by', 'தூண்டுதல் பெற்றவை')}</h3>
            <div className="flex flex-wrap gap-1">{m.influencedBy.map((f) => <Link key={f} to={`/missions/${f}`} className="chip hover:!border-accent hover:text-accent">{name(f)}</Link>)}</div>
          </div>
        )}
        {m.agreements.length > 0 && (
          <div className="card border-l-4 !border-l-[#2e9d5b] p-4">
            <h3 className="mb-2 font-bold">{L('Where it agreed', 'ஒத்துப்போன இடங்கள்')}</h3>
            {m.agreements.map((r, i) => <p key={i} className="mb-2 text-sm"><Link className="font-semibold text-accent" to={`/missions/${r.with}`}>{name(r.with)}</Link>: {r.text}</p>)}
          </div>
        )}
        {m.disagreements.length > 0 && (
          <div className="card border-l-4 !border-l-[#c2453a] p-4">
            <h3 className="mb-2 font-bold">{L('Where it disagreed', 'முரண்பட்ட இடங்கள்')}</h3>
            {m.disagreements.map((r, i) => <p key={i} className="mb-2 text-sm"><Link className="font-semibold text-accent" to={`/missions/${r.with}`}>{name(r.with)}</Link>: {r.text}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
