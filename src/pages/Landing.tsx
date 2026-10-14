import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { useAtlas } from '../data/db';
import { layoutLanes, lanePath, timeScale, NOW } from '../viz/river';
import { FAMILIES, formatYear } from '../data/families';
import { Icon, type IconName } from '../components/Icon';
import { CountUp, GlowCard, QuoteBlock, cx } from '../components/ui';

const HERO_IDS = new Set([
  'early-church', 'church-of-the-east', 'oriental-orthodox', 'eastern-orthodox', 'catholic', 'lutheran', 'reformed',
  'anglican', 'anabaptist', 'baptist', 'methodist', 'pentecostal', 'evangelical', 'charismatic-renewal',
  'african-initiated-churches', 'arian-homoian', 'montanist', 'russian-orthodox', 'presbyterian', 'holiness-movement',
]);

const W = 1200;
const LANE = 26;

function RiverHero() {
  const a = useAtlas();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const x = useMemo(() => timeScale(W), []);
  const lanes = useMemo(() => layoutLanes(a.traditions, LANE, (t) => HERO_IDS.has(t.id)), [a.traditions]);
  const H = Math.max(lanes.length * LANE, LANE);
  const clipW = useTransform(progress, [0, 0.92], [x(60), W]);
  const [year, setYear] = useState(30);
  useMotionValueEvent(progress, 'change', (p) => setYear(Math.round(x.invert(Math.min(W, x(60) + (W - x(60)) * Math.min(1, p / 0.92))))));

  const milestones = useMemo(
    () =>
      lanes
        .filter((l) => l.parent)
        .map((l) => ({ year: l.start, label: l.t.name, colour: l.colour, icon: FAMILIES[l.t.family].icon }))
        .sort((p, q) => p.year - q.year),
    [lanes],
  );
  const recent = milestones.filter((m) => m.year <= year).slice(-3).reverse();
  const era = a.eraOf(year);

  return (
    <section ref={ref} className="relative" style={{ height: '420vh' }} aria-label="River of time: scroll to watch the church branch over two thousand years">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        <div className="relative z-10 px-6 pt-6 sm:px-10 lg:pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent">An atlas of Christian history, doctrine & division</div>
            <h1 className="max-w-4xl text-3xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              One stream. <span className="text-gradient">Two thousand years.</span> A thousand branches.
            </h1>
          </motion.div>
          <div className="mt-3 flex flex-wrap items-end gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">Year</div>
              <div className="font-display text-4xl font-bold tabular-nums text-accent sm:text-5xl" aria-live="off">{formatYear(year)}</div>
            </div>
            <AnimatePresence mode="wait">
              {era && (
                <motion.div key={era.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md pb-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">Era</div>
                  <Link to={`/eras/${era.id}`} className="text-lg font-bold hover:text-accent" style={{ color: era.colour }}>{era.name}</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative flex-1 px-2 sm:px-6">
          <svg viewBox={`-20 -30 ${W + 300} ${H + 60}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Branching river of Christian traditions">
            <defs>
              <clipPath id="river-clip">
                <motion.rect x={-30} y={-40} height={H + 80} style={{ width: clipW }} />
              </clipPath>
              <filter id="river-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            {[100, 500, 1000, 1500, 1800, 1900, 2000].map((y) => (
              <g key={y} opacity={0.5}>
                <line x1={x(y)} x2={x(y)} y1={-20} y2={H + 10} stroke="var(--line)" strokeDasharray="2 6" />
                <text x={x(y)} y={H + 26} textAnchor="middle" fontSize={11} fill="var(--muted)">{y}</text>
              </g>
            ))}
            <g clipPath="url(#river-clip)">
              <g filter="url(#river-glow)" opacity={0.35}>
                {lanes.map((l) => <path key={l.t.id} d={lanePath(l, x, 70)} stroke={l.colour} strokeWidth={l.width * 1.8} fill="none" strokeLinecap="round" />)}
              </g>
              {lanes.map((l) => (
                <path key={l.t.id} d={lanePath(l, x, 70)} stroke={l.colour} strokeWidth={l.width} fill="none" strokeLinecap="round" opacity={0.92} />
              ))}
            </g>
            {lanes.map((l) => {
              const visible = year >= l.start;
              const alive = year < l.end;
              const headX = x(Math.min(year, l.end));
              return (
                <g key={l.t.id} style={{ transition: 'opacity .4s', opacity: visible ? 1 : 0 }}>
                  {alive && visible && <circle cx={headX} cy={l.y} r={l.width / 2 + 3} fill={l.colour} className="animate-pulse" />}
                  <Link to={`/traditions/${l.t.id}`}>
                    <text x={Math.max(x(l.start) + 74, Math.min(headX + 10, W + 8))} y={l.y + 4} fontSize={12} fontWeight={700} fill={l.colour} style={{ transition: 'x .2s' }}>
                      {l.t.name}
                    </text>
                  </Link>
                </g>
              );
            })}
          </svg>

          <div className="pointer-events-none absolute bottom-4 right-4 hidden w-72 space-y-2 sm:block">
            <AnimatePresence initial={false}>
              {recent.map((m) => (
                <motion.div layout key={m.label} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="card flex items-center gap-2 px-3 py-2 text-sm shadow-lg">
                  <Icon name={m.icon} style={{ color: m.colour }} />
                  <span className="font-bold">{m.label}</span>
                  <span className="ml-auto tabular-nums text-muted">{formatYear(m.year)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <motion.div className="pb-4 text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted" animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          {year < NOW - 2 ? 'Scroll to flow through time ↓' : 'Explore below ↓'}
        </motion.div>
      </div>
    </section>
  );
}

const FEATURES: { to: string; title: string; text: string; icon: IconName }[] = [
  { to: '/timeline', title: 'Master Timeline', text: 'Zoom from centuries to single years across events, people, writings and doctrines.', icon: 'timeline' },
  { to: '/traditions', title: 'Family Tree', text: 'Watch every tradition branch from the apostolic church, each split linked to its cause.', icon: 'tree' },
  { to: '/doctrines', title: 'Doctrine Skeletons', text: 'Interactive flowcharts: the question, the Scriptures, the rivals, the councils, the fallout.', icon: 'trinity' },
  { to: '/debates', title: 'Debate Arena', text: 'Each side’s best case in its own voice, then the counter-arguments.', icon: 'scales' },
  { to: '/map', title: 'World Map', text: 'An animated spread of the faith from Jerusalem to Seoul, Lagos and São Paulo.', icon: 'map' },
  { to: '/experiences', title: 'Experiences', text: 'Visions, tongues, healings and revivals, described neutrally and assessed from many sides.', icon: 'sparkles' },
  { to: '/compare/featured/legal-vs-union-gospel', title: 'Legal vs Union Gospel', text: 'A featured side-by-side of forensic and participatory frameworks.', icon: 'cross' },
  { to: '/paths', title: 'Study Paths', text: 'Guided, animated walkthroughs with a quiz at the end.', icon: 'compass' },
];

export default function Landing() {
  const a = useAtlas();
  const quotes = a.quotes.filter((q) => q.kind === 'quotation' && q.text.length < 260);
  const [qi, setQi] = useState(() => Math.floor(Math.random() * Math.max(1, quotes.length)));
  const q = quotes[qi % Math.max(1, quotes.length)];
  const stats = [
    { n: a.events.length, l: 'events' },
    { n: a.people.length, l: 'people' },
    { n: a.positions.length, l: 'doctrinal positions' },
    { n: a.traditions.length, l: 'traditions' },
    { n: a.quotes.length, l: 'quotations' },
    { n: a.experiences.length, l: 'experiences' },
  ];

  return (
    <div>
      <RiverHero />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card p-4 text-center">
              <CountUp to={s.n} className="block text-3xl font-bold text-accent tabular-nums" />
              <div className="text-xs font-semibold uppercase tracking-widest text-muted">{s.l}</div>
            </motion.div>
          ))}
        </div>

        <h2 className="mb-6 text-3xl font-bold">Ways in</h2>
        <div className="mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.to} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 4) * 0.07, type: 'spring', stiffness: 200, damping: 22 }}>
              <GlowCard to={f.to}>
                <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent ring-1 ring-line">
                  <Icon name={f.icon} size={22} />
                </motion.div>
                <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-ink-2">{f.text}</p>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        <h2 className="mb-6 text-3xl font-bold">Thirteen eras</h2>
        <div className="scrollbar-thin -mx-4 mb-16 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
          {a.eras.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 5) * 0.05 }} className="w-72 shrink-0 snap-start">
              <GlowCard to={`/eras/${e.id}`} accent={e.colour}>
                <div className="text-xs font-bold tabular-nums text-muted">{formatYear(e.startYear)} – {e.endYear >= NOW ? 'today' : formatYear(e.endYear)}</div>
                <h3 className="mb-2 mt-1 text-lg font-bold leading-tight" style={{ color: e.colour }}>{e.name}</h3>
                <p className="line-clamp-4 text-sm text-ink-2">{e.summary}</p>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        {q && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-bold">From the sources</h2>
              <button className="btn" onClick={() => setQi((i) => i + 1 + Math.floor(Math.random() * 5))}><Icon name="shuffle" /> Another</button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={{ opacity: 0, rotateX: -20 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 20 }} transition={{ duration: 0.35 }}>
                <QuoteBlock text={q.text} kind={q.kind} by={a.get<{ name: string }>('person', q.personId)?.name} citation={q.citation} to={`/people/${q.personId}`} />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        <div className={cx('mt-16 text-center')}>
          <Link to="/paths" className="btn btn-primary !px-6 !py-3 text-base">
            Start a guided study path <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
}
