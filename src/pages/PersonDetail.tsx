import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Person } from '../data/schema';
import { REGION_LABEL, formatSpan, formatYear } from '../data/families';
import { BookmarkButton, BulletList, ConfidenceBadge, EntityChips, PageHeader, QuoteBlock, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

function InfluenceGraph({ p }: { p: Person }) {
  const a = useAtlas();
  const ins = p.influencedBy.map((id) => a.get<Person>('person', id)).filter(Boolean) as Person[];
  const outs = a.influenced.get(p.id) ?? [];
  if (!ins.length && !outs.length) return null;
  const W = 640;
  const rows = Math.max(ins.length, outs.length, 1);
  const H = Math.max(140, rows * 34 + 20);
  const cy = H / 2;
  const yAt = (i: number, n: number) => (H / (n + 1)) * (i + 1);
  return (
    <Section title="Influence" icon="branch">
      <div className="card overflow-x-auto p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[520px]" role="img" aria-label="Who influenced whom">
          {ins.map((x, i) => (
            <motion.path key={'i' + x.id} d={`M170,${yAt(i, ins.length)} C250,${yAt(i, ins.length)} 250,${cy} ${W / 2 - 60},${cy}`} stroke="var(--accent)" strokeWidth={1.6} fill="none" opacity={0.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />
          ))}
          {outs.map((x, i) => (
            <motion.path key={'o' + x.id} d={`M${W / 2 + 60},${cy} C${W - 250},${cy} ${W - 250},${yAt(i, outs.length)} ${W - 170},${yAt(i, outs.length)}`} stroke="var(--accent-2)" strokeWidth={1.6} fill="none" opacity={0.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.4 + i * 0.08 }} />
          ))}
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ transformOrigin: `${W / 2}px ${cy}px` }}>
            <rect x={W / 2 - 60} y={cy - 18} width={120} height={36} rx={18} fill="var(--accent)" />
            <text x={W / 2} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--accent-ink)">{p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name}</text>
          </motion.g>
          {ins.map((x, i) => (
            <Link key={x.id} to={`/people/${x.id}`}>
              <text x={165} y={yAt(i, ins.length) + 4} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--ink-2)" className="hover:fill-[var(--accent)]">{x.name}</text>
            </Link>
          ))}
          {outs.map((x, i) => (
            <Link key={x.id} to={`/people/${x.id}`}>
              <text x={W - 165} y={yAt(i, outs.length) + 4} fontSize={12} fontWeight={600} fill="var(--ink-2)" className="hover:fill-[var(--accent)]">{x.name}</text>
            </Link>
          ))}
          <text x={10} y={14} fontSize={10} fill="var(--muted)" fontWeight={700}>INFLUENCED BY</text>
          <text x={W - 10} y={14} fontSize={10} fill="var(--muted)" fontWeight={700} textAnchor="end">INFLUENCED</text>
        </svg>
      </div>
    </Section>
  );
}

function MiniTimeline({ p }: { p: Person }) {
  const a = useAtlas();
  const born = p.born ?? (p.died !== undefined ? p.died - 60 : undefined);
  const died = p.died ?? 2026;
  if (born === undefined) return null;
  const from = born - 20;
  const to = died + 20;
  const X = (y: number) => ((y - from) / (to - from)) * 100;
  const evs = a.events.filter((e) => e.peopleIds.includes(p.id));
  const works = a.worksByAuthor.get(p.id) ?? [];
  return (
    <Section title="Life in time" icon="timeline">
      <div className="card relative h-28 overflow-hidden p-4">
        {a.eras.filter((e) => e.endYear > from && e.startYear < to).map((e) => (
          <div key={e.id} className="absolute inset-y-0 opacity-10" style={{ left: `${Math.max(0, X(e.startYear))}%`, width: `${X(Math.min(e.endYear, to)) - Math.max(0, X(e.startYear))}%`, background: e.colour }} title={e.name} />
        ))}
        <motion.div className="absolute top-12 h-2.5 rounded-full bg-accent" style={{ left: `${X(born)}%` }} initial={{ width: 0 }} animate={{ width: `${X(died) - X(born)}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        <div className="absolute top-16 text-xs font-bold tabular-nums text-muted" style={{ left: `${X(born)}%` }}>{formatYear(born, p.circa)}</div>
        <div className="absolute top-16 -translate-x-full text-xs font-bold tabular-nums text-muted" style={{ left: `${X(died)}%` }}>{p.died ? formatYear(died) : ''}</div>
        {evs.map((e, i) => (
          <Link key={e.id} to={`/events/${e.id}`} title={`${e.title} (${formatYear(e.year)})`} className="absolute top-5 -translate-x-1/2" style={{ left: `${X(e.year)}%` }}>
            <motion.span className="block h-4 w-4 rotate-45 rounded-sm bg-accent-2 ring-2 ring-surface" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.1 }} whileHover={{ scale: 1.5 }} />
          </Link>
        ))}
        {works.map((w, i) => (
          <Link key={w.id} to={`/library/${w.id}`} title={`${w.title} (${formatYear(w.year)})`} className="absolute top-[4.6rem] -translate-x-1/2" style={{ left: `${X(w.year)}%` }}>
            <motion.span className="block h-3.5 w-3.5 rounded-full bg-gold ring-2 ring-surface" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.5 }} />
          </Link>
        ))}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-muted"><span>◆ events</span><span>● writings</span><span>shaded: eras</span></div>
    </Section>
  );
}

export default function PersonDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const p = a.get<Person>('person', id);
  if (!p) return <NotFound />;
  const quotes = a.quotesByPerson.get(p.id) ?? [];
  const works = a.worksByAuthor.get(p.id) ?? [];
  const positions = a.positionsByPerson.get(p.id) ?? [];
  const exps = a.experiencesByPerson.get(p.id) ?? [];
  return (
    <div>
      <PageHeader eyebrow={formatSpan(p.born, p.died, p.circa)} icon="people" title={p.name} actions={<BookmarkButton type="person" id={p.id} label={p.name} />}>
        <p>{p.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.roles.map((r) => <span key={r} className="chip">{r}</span>)}
          {p.regions.map((r) => <span key={r} className="chip">{REGION_LABEL[r]}</span>)}
          <ConfidenceBadge value={p.confidence} />
        </div>
      </PageHeader>
      <MiniTimeline p={p} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <Section title="Key ideas" icon="lamp"><BulletList items={p.keyIdeas} /></Section>
          <InfluenceGraph p={p} />
          {quotes.length > 0 && (
            <Section title="In their words" icon="quote">
              <div className="grid gap-3">
                {quotes.map((q) => <QuoteBlock key={q.id} text={q.text} kind={q.kind} citation={q.citation} to={q.workId ? `/library/${q.workId}` : undefined} />)}
              </div>
            </Section>
          )}
        </div>
        <aside>
          <Section title="Traditions" icon="tree"><EntityChips type="tradition" ids={p.traditionIds} /></Section>
          {works.length > 0 && <Section title="Writings" icon="book"><EntityChips type="work" ids={works.map((w) => w.id)} /></Section>}
          {positions.length > 0 && <Section title="Positions championed" icon="branch"><EntityChips type="position" ids={positions.map((x) => x.id)} /></Section>}
          {exps.length > 0 && <Section title="Experiences" icon="sparkles"><EntityChips type="experience" ids={exps.map((x) => x.id)} /></Section>}
        </aside>
      </div>
      <Sources ids={p.sources} />
    </div>
  );
}
