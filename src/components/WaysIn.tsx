import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas, type Atlas } from '../data/db';
import { FAMILIES, formatYear } from '../data/families';
import { Icon, type IconName } from './Icon';
import { cx } from './ui';

interface Feature { id: string; to: string; title: string; text: string; icon: IconName; group: 'Explore' | 'Think' | 'Read' | 'Learn' }

const FEATURES: Feature[] = [
  { id: 'timeline', to: '/timeline', title: 'Master Timeline', text: 'Zoom from centuries to single years across events, people, writings and doctrines.', icon: 'timeline', group: 'Explore' },
  { id: 'eras', to: '/eras', title: 'Eras & Life', text: 'Thirteen eras, each with worship, art, missions and life beyond the West.', icon: 'hourglass', group: 'Explore' },
  { id: 'map', to: '/map', title: 'World Map', text: 'An animated spread of the faith from Jerusalem to Seoul, Lagos and São Paulo.', icon: 'map', group: 'Explore' },
  { id: 'tree', to: '/traditions', title: 'Family Tree', text: 'Every tradition branching from the apostolic church, each split linked to its cause.', icon: 'tree', group: 'Explore' },
  { id: 'doctrines', to: '/doctrines', title: 'Doctrine Explorer', text: 'The question, the Scriptures, the rivals, the councils and the fallout, played step by step.', icon: 'trinity', group: 'Think' },
  { id: 'debates', to: '/debates', title: 'Debate Arena', text: 'Each side’s best case in its own voice, then the counter-arguments.', icon: 'scales', group: 'Think' },
  { id: 'compare', to: '/compare', title: 'Compare', text: 'Put churches or positions side by side on authority, salvation, sacraments and more.', icon: 'layers', group: 'Think' },
  { id: 'legal', to: '/compare/featured/legal-vs-union-gospel', title: 'Legal vs Union Gospel', text: 'A featured comparison of forensic and participatory frameworks.', icon: 'cross', group: 'Think' },
  { id: 'people', to: '/people', title: 'People', text: 'Theologians, martyrs, mystics and missionaries, with who influenced whom.', icon: 'people', group: 'Read' },
  { id: 'library', to: '/library', title: 'Library', text: 'Creeds, letters, sermons and treatises, with links to full public-domain texts.', icon: 'book', group: 'Read' },
  { id: 'quotes', to: '/quotes', title: 'Quote Wall', text: 'Every quotation with its citation, filterable by topic, era and author.', icon: 'quote', group: 'Read' },
  { id: 'experiences', to: '/experiences', title: 'Experiences', text: 'Visions, healings and revivals told as full stories and assessed from many sides.', icon: 'sparkles', group: 'Read' },
  { id: 'paths', to: '/paths', title: 'Study Paths', text: 'Guided, animated walkthroughs with a quiz at the end.', icon: 'compass', group: 'Learn' },
  { id: 'ask', to: '/ask', title: 'Ask the Atlas', text: 'A built-in guide that answers questions from the atlas, even offline.', icon: 'sparkles', group: 'Learn' },
];

/** How the parts of the atlas feed one another. Drawn as connectors between the cards. */
const LINKS: [string, string, string][] = [
  ['timeline', 'eras', 'events by era'], ['timeline', 'people', 'lifespans'], ['eras', 'map', 'where it happened'], ['eras', 'experiences', 'revivals by era'],
  ['tree', 'compare', 'churches side by side'], ['tree', 'doctrines', 'who holds what'], ['doctrines', 'debates', 'the arguments'], ['doctrines', 'compare', 'positions side by side'],
  ['doctrines', 'legal', 'atonement & salvation'], ['debates', 'quotes', 'in their own words'], ['people', 'library', 'their writings'], ['library', 'quotes', 'key passages'],
  ['experiences', 'map', 'where it happened'], ['paths', 'doctrines', 'guided tours'], ['paths', 'tree', 'how churches multiplied'], ['ask', 'people', 'answers from entries'], ['ask', 'doctrines', 'answers from entries'],
];
const GROUPS: Feature['group'][] = ['Explore', 'Think', 'Read', 'Learn'];

export function WaysIn() {
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ a: string; b: string; d: string; label: string; mx: number; my: number }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const focus = hover ?? open;

  // Measure the cards and draw curved connectors between related ones.
  const measure = () => {
    const root = box.current;
    if (!root) return;
    const r0 = root.getBoundingClientRect();
    setSize({ w: r0.width, h: r0.height });
    const centre = (id: string) => {
      const el = cards.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - r0.left + r.width / 2, y: r.top - r0.top + r.height / 2, w: r.width, h: r.height };
    };
    const out: typeof lines = [];
    for (const [a, b, label] of LINKS) {
      const p = centre(a), q = centre(b);
      if (!p || !q) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      // Leave from the side facing the other card; bow the curve so parallel links do not overlap.
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const sx = p.x + (horizontal ? Math.sign(dx) * p.w / 2 : 0), sy = p.y + (horizontal ? 0 : Math.sign(dy) * p.h / 2);
      const ex = q.x - (horizontal ? Math.sign(dx) * q.w / 2 : 0), ey = q.y - (horizontal ? 0 : Math.sign(dy) * q.h / 2);
      const bow = horizontal ? { x: 0, y: -Math.min(60, Math.abs(dx) * 0.15) } : { x: Math.min(60, Math.abs(dy) * 0.25), y: 0 };
      const c1x = sx + (ex - sx) / 3 + bow.x, c1y = sy + (ey - sy) / 3 + bow.y, c2x = sx + (2 * (ex - sx)) / 3 + bow.x, c2y = sy + (2 * (ey - sy)) / 3 + bow.y;
      out.push({ a, b, label, d: `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`, mx: (sx + ex) / 2 + bow.x * 0.75, my: (sy + ey) / 2 + bow.y * 0.75 });
    }
    setLines(out);
  };
  useLayoutEffect(measure, [open]);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const related = (id: string) => LINKS.filter(([a, b]) => a === id || b === id).map(([a, b, l]) => ({ id: a === id ? b : a, label: l }));
  const lit = (l: { a: string; b: string }) => !!focus && (l.a === focus || l.b === focus);

  return (
    <section className="mb-16" aria-labelledby="ways-in">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 id="ways-in" className="text-3xl font-bold">Ways in</h2>
        <p className="text-sm text-muted">Point at a card to see what it connects to; click it for a live preview.</p>
      </div>
      <div ref={box} className="relative">
        {/* Connectors (desktop): drawn behind the cards. */}
        <svg className="pointer-events-none absolute inset-0 hidden lg:block" width={size.w} height={size.h} aria-hidden>
          {lines.map((l, i) => (
            <g key={l.a + l.b} style={{ opacity: focus ? (lit(l) ? 1 : 0.08) : 0.35, transition: 'opacity .25s' }}>
              <motion.path d={l.d} fill="none" stroke="var(--accent)" strokeWidth={lit(l) ? 2.2 : 1.4} strokeDasharray={lit(l) ? '0' : '4 5'} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.3 + i * 0.05 }} />
              {lit(l) && (
                <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${l.mx}px ${l.my}px` }}>
                  <rect x={l.mx - l.label.length * 3.3 - 8} y={l.my - 10} width={l.label.length * 6.6 + 16} height={20} rx={10} fill="var(--surface)" stroke="var(--accent)" />
                  <text x={l.mx} y={l.my + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink-2)">{l.label}</text>
                </motion.g>
              )}
              {lit(l) && <circle r={3.5} fill="var(--accent)"><animateMotion dur="2.2s" repeatCount="indefinite" path={l.d} /></circle>}
            </g>
          ))}
        </svg>

        <div className="relative grid gap-x-10 gap-y-6 lg:grid-cols-4">
          {GROUPS.map((g, gi) => (
            <div key={g}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-muted">{g}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {FEATURES.filter((f) => f.group === g).map((f, i) => (
                  <motion.button
                    key={f.id}
                    ref={(el) => { if (el) cards.current.set(f.id, el); }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: !focus || focus === f.id || related(focus).some((r) => r.id === f.id) ? 1 : 0.45, y: 0, scale: open === f.id ? 1.02 : 1 }}
                    transition={{ delay: gi * 0.08 + i * 0.05, type: 'spring', stiffness: 220, damping: 22 }}
                    onMouseEnter={() => setHover(f.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(f.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => setOpen(open === f.id ? null : f.id)}
                    aria-expanded={open === f.id}
                    className={cx('card group relative w-full p-4 text-left transition-shadow hover:shadow-[0_18px_40px_-20px_rgb(var(--glow)/0.55)]', open === f.id && 'ring-2 ring-accent')}
                  >
                    <div className="flex items-center gap-3">
                      <motion.span whileHover={{ rotate: -10, scale: 1.1 }} className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-line', open === f.id ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-accent')}>
                        <Icon name={f.icon} size={20} />
                      </motion.span>
                      <span className="min-w-0 flex-1 font-bold leading-tight">{f.title}</span>
                      <motion.span animate={{ rotate: open === f.id ? 45 : 0 }} className="text-muted" aria-hidden><Icon name="plus" size={16} /></motion.span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div key={open} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden">
            <Preview f={FEATURES.find((x) => x.id === open)!} related={related(open)} onPick={setOpen} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Preview({ f, related, onPick }: { f: Feature; related: { id: string; label: string }[]; onPick: (id: string) => void }) {
  const a = useAtlas();
  const body = useMemo(() => previewFor(a, f.id), [a, f.id]);
  return (
    <div className="mt-6 rounded-2xl border border-accent/40 bg-surface p-5 shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.6)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xl font-bold"><Icon name={f.icon} className="text-accent" /> {f.title}</h3>
        <Link to={f.to} className="btn btn-primary">Open {f.title} <Icon name="arrow" size={15} /></Link>
      </div>
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>{body}</motion.div>
      {related.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Connects to</div>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => {
              const t = FEATURES.find((x) => x.id === r.id)!;
              return (
                <button key={r.id} onClick={() => onPick(r.id)} className="chip cursor-pointer transition hover:border-accent hover:text-accent">
                  <Icon name={t.icon} size={12} /> {t.title} <span className="text-muted">· {r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const Row = ({ to, top, title, sub }: { to: string; top?: ReactNode; title: ReactNode; sub?: ReactNode }) => (
  <motion.li variants={item}>
    <Link to={to} className="block rounded-xl border border-line p-3 transition hover:-translate-y-0.5 hover:border-accent">
      {top && <span className="block text-xs tabular-nums text-muted">{top}</span>}
      <span className="block font-semibold leading-snug">{title}</span>
      {sub && <span className="line-clamp-2 block text-sm text-ink-2">{sub}</span>}
    </Link>
  </motion.li>
);
const Stat = ({ n, label }: { n: number; label: string }) => (
  <motion.div variants={item} className="rounded-xl bg-surface-2 px-4 py-3 text-center">
    <div className="text-2xl font-bold tabular-nums text-accent">{n.toLocaleString()}</div>
    <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
  </motion.div>
);
const Grid = ({ children }: { children: ReactNode }) => <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
const Stats = ({ children }: { children: ReactNode }) => <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>;

function previewFor(a: Atlas, id: string): ReactNode {
  const pick = <T,>(xs: T[], n: number) => xs.filter((_, i) => i % Math.max(1, Math.floor(xs.length / n)) === 0).slice(0, n);
  switch (id) {
    case 'timeline':
      return <><Stats><Stat n={a.events.length} label="events" /><Stat n={a.people.length} label="people" /><Stat n={a.works.length} label="writings" /><Stat n={a.positions.length} label="doctrines’ positions" /></Stats>
        <Grid>{pick(a.events, 6).map((e) => <Row key={e.id} to={`/events/${e.id}`} top={formatYear(e.year, e.circa)} title={e.title} sub={e.summary} />)}</Grid></>;
    case 'eras':
      return <Grid>{a.eras.slice(0, 13).map((e) => <Row key={e.id} to={`/eras?open=${e.id}`} top={`${formatYear(e.startYear)} – ${e.endYear >= 2026 ? 'today' : formatYear(e.endYear)}`} title={e.name} sub={e.keyThemes.slice(0, 3).join(' · ')} />)}</Grid>;
    case 'map':
      return <><Stats><Stat n={a.presences.filter((p) => p.kind !== 'mission-route').length} label="places" /><Stat n={a.presences.filter((p) => p.kind === 'mission-route').length} label="mission routes" /><Stat n={a.events.filter((e) => e.place).length} label="mapped events" /><Stat n={a.experiences.length} label="experiences" /></Stats>
        <Grid>{pick(a.presences.filter((p) => p.kind === 'mission-route'), 6).map((p) => <Row key={p.id} to="/map" top={formatYear(p.year)} title={p.label} sub={p.note} />)}</Grid></>;
    case 'tree': {
      const fams = Object.entries(FAMILIES).map(([k, f]) => ({ k, f, n: a.traditions.filter((t) => t.family === k).length })).filter((x) => x.n);
      return <><Stats><Stat n={a.traditions.length} label="traditions" /><Stat n={fams.length} label="families" /><Stat n={a.traditions.filter((t) => t.splitEventId).length} label="split events" /><Stat n={a.traditions.filter((t) => t.endYear).length} label="ended" /></Stats>
        <div className="flex flex-wrap gap-2">{fams.map(({ k, f, n }) => <motion.span key={k} variants={item} className="chip" style={{ borderColor: f.colour }}><Icon name={f.icon} size={12} style={{ color: f.colour }} /> {f.label} · {n}</motion.span>)}</div></>;
    }
    case 'doctrines':
      return <Grid>{a.doctrines.map((d) => <Row key={d.id} to={`/doctrines?open=${d.id}`} top={`${a.positionsByDoctrine.get(d.id)?.length ?? 0} positions`} title={d.name} sub={d.question} />)}</Grid>;
    case 'debates':
      return <Grid>{pick(a.controversies, 9).map((c) => <Row key={c.id} to={`/debates/${c.id}`} top={c.sides.map((s) => s.name).join(' vs ')} title={c.title} sub={c.question} />)}</Grid>;
    case 'compare':
      return <Grid>{[['Catholic, Orthodox, Lutheran, Reformed', 'The three great families'], ['Orthodox, Oriental, Church of the East', 'Ancient churches of the East'], ['Anabaptist, Baptist, Quaker, Pentecostal', 'Radical & free churches']].map(([s, t]) => <Row key={t} to="/compare" title={t} sub={s} />)}</Grid>;
    case 'legal': {
      const c = a.comparisons[0];
      return c ? <><p className="mb-3 max-w-3xl text-ink-2">{c.summary}</p><Grid>{c.rows.slice(0, 6).map((r) => <Row key={r.topic} to={`/compare/featured/${c.id}`} title={r.topic} sub={`${r.cells[0]} | ${r.cells[1]}`} />)}</Grid></> : null;
    }
    case 'people':
      return <Grid>{pick(a.people, 9).map((p) => <Row key={p.id} to={`/people/${p.id}`} top={p.roles.slice(0, 2).join(', ')} title={p.name} sub={p.summary} />)}</Grid>;
    case 'library':
      return <Grid>{pick(a.works, 9).map((w) => <Row key={w.id} to={`/library/${w.id}`} top={`${w.genre} · ${formatYear(w.year, w.circa)}`} title={w.title} sub={w.summary} />)}</Grid>;
    case 'quotes':
      return <Grid>{pick(a.quotes.filter((q) => q.kind === 'quotation' && q.text.length < 220), 6).map((q) => <Row key={q.id} to={`/quotes#${q.id}`} top={a.get<{ name: string }>('person', q.personId)?.name} title={<span className="font-serif italic">“{q.text}”</span>} sub={q.citation} />)}</Grid>;
    case 'experiences':
      return <Grid>{pick(a.experiences, 9).map((x) => <Row key={x.id} to={`/experiences/${x.id}`} top={`${formatYear(x.year, x.circa)} · ${x.place.name}`} title={x.title} sub={x.account} />)}</Grid>;
    case 'paths':
      return <Grid>{a.paths.map((p) => <Row key={p.id} to={`/paths/${p.id}`} top={`${p.steps.length} steps · ${p.quiz.length}-question quiz`} title={p.title} sub={p.summary} />)}</Grid>;
    case 'ask':
      return <Grid>{['Who was Athanasius?', 'Trace the Assemblies of God back to the early church', 'Compare penal substitution and Christus Victor', 'What do Methodists believe about salvation?', 'Why did the Great Schism happen?', 'What happened in the 4th century?'].map((q) => <Row key={q} to={`/ask?q=${encodeURIComponent(q)}`} title={q} sub="Ask this question" />)}</Grid>;
  }
  return null;
}
