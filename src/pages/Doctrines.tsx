import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useAtlas, hrefFor, labelFor } from '../data/db';
import type { Doctrine, Position, Quote } from '../data/schema';
import { FLOW_KIND_META, formatYear } from '../data/families';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader, Empty, QuoteBlock, cx } from '../components/ui';

export const DOCTRINE_ICON: Record<string, IconName> = {
  trinity: 'trinity', cross: 'cross', book: 'book', dove: 'dove', flame: 'flame', crown: 'crown', chalice: 'chalice',
  water: 'water', scroll: 'scroll', hourglass: 'hourglass', star: 'star', scales: 'scales', globe: 'globe',
  sun: 'sun', people: 'people', lamp: 'lamp', quill: 'quill', compass: 'compass',
};

const STANDING: { id: Position['standing']; label: string; note: string }[] = [
  { id: 'majority', label: 'Majority views', note: 'held by most Christians or most churches today' },
  { id: 'significant', label: 'Significant views', note: 'held by large traditions or movements' },
  { id: 'minority', label: 'Minority views', note: 'held by smaller groups or individual theologians' },
  { id: 'historic', label: 'Historic views', note: 'important in the past, rarely held today' },
  { id: 'rejected-by-councils', label: 'Rejected by councils', note: 'condemned by councils or synods' },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.15 } } };
const rise = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

export default function Doctrines() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const toggle = (id: string) => setParams(open === id ? {} : { open: id }, { replace: true });

  return (
    <div>
      <PageHeader eyebrow="Think" icon="trinity" title="Doctrine Explorer">
        Every doctrine as something that <em>developed</em>: the question that prompted it, the Scriptures and early voices,
        the rival answers, the decisions and the fallout. Click a doctrine to expand it here, or open its full flowchart and story.
      </PageHeader>
      {a.doctrines.length === 0 && <Empty>Doctrine content is still being written.</Empty>}
      <LayoutGroup>
        <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {a.doctrines.map((d, i) => (
            <DoctrineCard key={d.id} d={d} i={i} open={open === d.id} onToggle={() => toggle(d.id)} />
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

function DoctrineCard({ d, i, open, onToggle }: { d: Doctrine; i: number; open: boolean; onToggle: () => void }) {
  const a = useAtlas();
  const ref = useRef<HTMLDivElement>(null);
  const ps = a.positionsByDoctrine.get(d.id) ?? [];
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
  }, [open]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ layout: { type: 'spring', stiffness: 260, damping: 30 }, delay: open ? 0 : i * 0.04, type: 'spring', stiffness: 200, damping: 20 }}
      style={{ transformPerspective: 900 }}
      className={cx('card relative scroll-mt-20 overflow-hidden', open ? 'sm:col-span-2 lg:col-span-3 shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.7)] ring-2 ring-accent/40' : 'transition-shadow hover:shadow-[0_18px_40px_-20px_rgb(var(--glow)/0.55)]')}
    >
      <motion.button
        layout="position"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`doctrine-${d.id}`}
        className="group block w-full p-5 text-left"
      >
        <div className="mb-3 flex items-center gap-3">
          <motion.div layout animate={{ rotate: open ? 360 : 0 }} transition={{ duration: 0.7 }} className={cx('flex shrink-0 items-center justify-center rounded-2xl ring-1 ring-line', open ? 'h-14 w-14 bg-accent text-accent-ink' : 'h-12 w-12 bg-surface-2 text-accent')}>
            <Icon name={DOCTRINE_ICON[d.icon]} size={open ? 30 : 26} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className={cx('font-bold leading-tight', open ? 'text-2xl sm:text-3xl' : 'text-xl')}>{d.name}</h2>
            <div className="text-xs text-muted">{ps.length} positions · {d.flow.nodes.length} steps · {(a.controversiesByDoctrine.get(d.id) ?? []).length} debates</div>
          </div>
          <motion.span animate={{ rotate: open ? 45 : 0 }} className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line', open ? 'bg-accent text-accent-ink' : 'text-muted group-hover:border-accent group-hover:text-accent')} aria-hidden>
            <Icon name="plus" size={18} />
          </motion.span>
        </div>
        <p className={cx('font-serif italic leading-snug text-ink-2', open ? 'text-2xl' : 'mb-3 text-lg')}>“{d.question}”</p>
        {!open && (
          <div className="flex flex-wrap gap-1">
            {ps.slice(0, 5).map((p) => <span key={p.id} className="chip">{p.name}</span>)}
            {ps.length > 5 && <span className="chip">+{ps.length - 5}</span>}
          </div>
        )}
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`doctrine-${d.id}`}
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.3, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <Expanded d={d} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Expanded({ d }: { d: Doctrine }) {
  const a = useAtlas();
  const ps = a.positionsByDoctrine.get(d.id) ?? [];
  const debates = a.controversiesByDoctrine.get(d.id) ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(0);
  const people = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of ps) for (const id of p.proponentIds) if (a.get('person', id)) count.set(id, (count.get(id) ?? 0) + 1);
    return [...count.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([id]) => id);
  }, [a, ps]);
  const quote = useMemo(() => {
    for (const n of d.flow.nodes) for (const q of n.quoteIds) { const qq = a.get<Quote>('quote', q); if (qq?.kind === 'quotation') return qq; }
    return a.quotes.find((q) => q.doctrineIds.includes(d.id));
  }, [a, d]);
  const paras = (d.longText ?? d.summary).split(/\n\s*\n/).filter(Boolean);
  const pickedPos = ps.find((p) => p.id === picked);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 border-t border-line px-5 pb-6 pt-5">
      {/* Overview */}
      <motion.div variants={rise} className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="prose-atlas max-w-[68ch] text-ink-2">
          {paras.slice(0, 2).map((p, i) => <p key={i} className={i === 0 ? 'illuminated' : ''}>{p}</p>)}
        </div>
        <div className="space-y-4">
          {quote && <QuoteBlock text={quote.text} kind={quote.kind} by={labelFor(a, 'person', quote.personId)} citation={quote.citation} />}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setAutoplay((n) => n + 1); document.getElementById(`player-${d.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="btn btn-primary"><Icon name="play" size={15} /> Play the development</button>
            <Link to={`/doctrines/${d.id}?view=chart&play=1`} className="btn"><Icon name="branch" size={15} /> Open the flowchart</Link>
            <Link to={`/doctrines/${d.id}?view=story`} className="btn"><Icon name="scroll" size={15} /> Read the full story</Link>
          </div>
        </div>
      </motion.div>

      {/* Development timeline */}
      <motion.section variants={rise}>
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="timeline" className="text-accent" /> How it developed</h3>
        <DevelopmentPlayer d={d} playSignal={autoplay} />
      </motion.section>

      {/* Positions */}
      <motion.section variants={rise}>
        <h3 className="mb-1 flex items-center gap-2 font-bold"><Icon name="layers" className="text-accent" /> The positions ({ps.length})</h3>
        <p className="mb-4 text-sm text-muted">Click a position for its claims, best arguments and strongest objections.</p>
        <div className="space-y-5">
          {STANDING.map((s) => {
            const group = ps.filter((p) => p.standing === s.id);
            if (!group.length) return null;
            return (
              <div key={s.id}>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{s.label} <span className="font-normal normal-case tracking-normal">— {s.note}</span></div>
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((p) => (
                    <motion.button
                      key={p.id}
                      variants={rise}
                      whileHover={{ y: -2 }}
                      onClick={() => setPicked(picked === p.id ? null : p.id)}
                      aria-pressed={picked === p.id}
                      className={cx('rounded-xl border p-3 text-left transition-colors', picked === p.id ? 'border-accent bg-surface-2' : 'border-line bg-surface hover:border-accent')}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold leading-snug">{p.name}</span>
                        {p.originYear !== undefined && <span className="shrink-0 text-xs tabular-nums text-muted">{formatYear(p.originYear)}</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.oneLine}</p>
                    </motion.button>
                  ))}
                </motion.div>
                <AnimatePresence>
                  {pickedPos && group.some((g) => g.id === pickedPos.id) && <PositionPeek key={pickedPos.id} p={pickedPos} />}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Debates and people */}
      <motion.div variants={rise} className="grid gap-6 md:grid-cols-2">
        {debates.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="scales" className="text-accent" /> Debates</h3>
            <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {debates.map((c) => (
                <motion.li key={c.id} variants={rise}>
                  <Link to={hrefFor('controversy', c.id)} className="block rounded-xl border border-line p-3 transition hover:border-accent">
                    <div className="font-semibold">{c.title}</div>
                    <div className="font-serif italic text-ink-2">{c.question}</div>
                    <div className="mt-1 text-xs text-muted">{c.sides.map((s) => s.name).join(' vs ')}</div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </section>
        )}
        {people.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="people" className="text-accent" /> Key voices</h3>
            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap gap-2">
              {people.map((id) => (
                <motion.div key={id} variants={rise}>
                  <Link to={hrefFor('person', id)} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm transition hover:border-accent">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-serif font-semibold text-accent-ink">{labelFor(a, 'person', id).replace(/^(St\.?|Saint|Pope|Mar)\s+/, '')[0]}</span>
                    {labelFor(a, 'person', id)}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * The doctrine's development as an animated player: a strip of dated steps plus a large card for the
 * current step. Play walks through every step in order; prev/next and the dots step by hand.
 */
function DevelopmentPlayer({ d, playSignal }: { d: Doctrine; playSignal: number }) {
  const a = useAtlas();
  const nodes = useMemo(() => [...d.flow.nodes].sort((x, y) => (x.year ?? -99999) - (y.year ?? -99999)), [d]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { if (playSignal > 0) { setIdx(0); setPlaying(true); } }, [playSignal]);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (idx >= nodes.length - 1) setPlaying(false);
      else setIdx((i) => i + 1);
    }, 2600);
    return () => clearTimeout(t);
  }, [playing, idx, nodes.length]);
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [idx]);
  const n = nodes[idx];
  if (!n) return null;
  const m = FLOW_KIND_META[n.kind];
  const quote = n.quoteIds.map((q) => a.get<Quote>('quote', q)).find(Boolean);
  const go = (i: number) => { setPlaying(false); setIdx(Math.max(0, Math.min(nodes.length - 1, i))); };

  return (
    <div id={`player-${d.id}`} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary !py-1.5" onClick={() => { if (idx >= nodes.length - 1) setIdx(0); setPlaying((p) => !p); }} aria-pressed={playing}>
          <Icon name={playing ? 'pause' : 'play'} size={15} /> {playing ? 'Pause' : idx > 0 ? 'Resume' : 'Play the development'}
        </button>
        <button className="btn !px-2.5 !py-1.5" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous step"><Icon name="arrow-left" size={15} /></button>
        <button className="btn !px-2.5 !py-1.5" onClick={() => go(idx + 1)} disabled={idx === nodes.length - 1} aria-label="Next step"><Icon name="arrow" size={15} /></button>
        <div className="ml-auto flex items-baseline gap-2">
          <AnimatePresence mode="popLayout">
            <motion.span key={n.year ?? 'q'} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="text-2xl font-bold tabular-nums text-accent">
              {n.year !== undefined ? formatYear(n.year) : 'The question'}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-muted">step {idx + 1} of {nodes.length}</span>
        </div>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
        <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${((idx + 1) / nodes.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
      <div ref={strip} className="scrollbar-thin -mx-1 overflow-x-auto px-1 pb-2">
        <div className="relative flex min-w-max items-end gap-1 pt-1">
          <div className="absolute inset-x-0 bottom-[7px] h-0.5 bg-line" />
          {nodes.map((x, i) => (
            <motion.button
              key={x.id}
              data-i={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: i <= idx ? 1 : 0.35, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.02, type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => go(i)}
              className="relative flex w-10 flex-col items-center gap-1"
              aria-label={`${x.year !== undefined ? formatYear(x.year) : 'Question'}: ${x.label}`}
              aria-current={i === idx ? 'step' : undefined}
            >
              <span className="text-[10px] tabular-nums text-muted">{x.year === undefined ? 'Q' : x.year < 0 ? `${-x.year}BC` : x.year}</span>
              <span className={cx('h-4 w-4 rounded-full ring-2 ring-surface transition-transform', i === idx && 'scale-150 ring-accent')} style={{ background: FLOW_KIND_META[x.kind].colour }} />
            </motion.button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: 40, rotateY: -8 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{ opacity: 0, x: -40, rotateY: 8 }}
          transition={{ duration: 0.35, ease: [0.3, 0, 0.2, 1] }}
          style={{ transformPerspective: 1000, borderLeft: `5px solid ${m.colour}` }}
          className="mt-2 grid gap-4 rounded-2xl border border-line bg-surface-2 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]"
        >
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: m.colour }}><Icon name={m.icon} size={13} /> {m.label}</div>
            <div className="text-lg font-bold leading-snug">{n.label}</div>
            {n.text && <p className="mt-2 leading-relaxed text-ink-2">{n.text}</p>}
            {n.ref && !!a.get(n.ref.type, n.ref.id) && <Link to={hrefFor(n.ref.type, n.ref.id)} className="mt-2 inline-block text-sm font-semibold text-accent underline">Read more: {labelFor(a, n.ref.type, n.ref.id)}</Link>}
          </div>
          {quote ? <QuoteBlock text={quote.text} kind={quote.kind} by={labelFor(a, 'person', quote.personId)} citation={quote.citation} /> : <div className="hidden md:block" />}
        </motion.div>
      </AnimatePresence>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
        {Object.values(FLOW_KIND_META).map((k) => <span key={k.label} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: k.colour }} />{k.label}</span>)}
      </div>
    </div>
  );
}

function PositionPeek({ p }: { p: Position }) {
  const a = useAtlas();
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
      <div className="mt-3 rounded-2xl border border-accent/40 bg-surface-2 p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-bold">{p.name}</h4>
          <Link to={hrefFor('position', p.id)} className="btn !py-1 text-sm">Full page <Icon name="arrow" size={14} /></Link>
        </div>
        <p className="mb-4 text-ink-2">{p.oneLine}</p>
        <div className="grid gap-5 md:grid-cols-3">
          {([['Core claims', p.coreClaims, 'check', 'text-good'], ['Best arguments', p.strongestArguments, 'arrow', 'text-good'], ['Strongest objections', p.strongestObjections, 'question', 'text-bad']] as const).map(([title, items, icon, tone], col) => (
            <div key={title}>
              <div className={cx('mb-2 text-xs font-bold uppercase tracking-widest', tone)}>{title}</div>
              <ul className="space-y-1.5">
                {items.slice(0, 3).map((t, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + col * 0.08 + i * 0.05 }} className="flex gap-2 text-sm leading-relaxed text-ink-2">
                    <Icon name={icon} size={14} className={cx('mt-0.5 shrink-0', tone)} />
                    <span>{t}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {p.traditionIds.length > 0 && (
          <div className="mt-4 text-sm text-muted">Held by: {p.traditionIds.slice(0, 6).map((id, i) => <span key={id}>{i > 0 && ', '}<Link to={hrefFor('tradition', id)} className="text-accent hover:underline">{labelFor(a, 'tradition', id)}</Link></span>)}</div>
        )}
      </div>
    </motion.div>
  );
}
