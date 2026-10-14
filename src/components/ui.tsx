import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { useAtlas, hrefFor, labelFor } from '../data/db';
import { CONFIDENCE_META, FAMILIES } from '../data/families';
import type { EntityType, Source, Tradition } from '../data/schema';
import { useUi } from '../store/ui';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function PageHeader({ eyebrow, title, children, icon, actions }: { eyebrow?: string; title: ReactNode; children?: ReactNode; icon?: IconName; actions?: ReactNode }) {
  return (
    <header className="relative mb-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            {icon && <Icon name={icon} size={16} />} {eyebrow}
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl md:text-5xl">{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2 sm:text-lg">{children}</div>}
      </motion.div>
      <motion.hr className="gold-rule mt-6" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.1 }} style={{ transformOrigin: 'left' }} />
    </header>
  );
}

export function Section({ title, icon, children, className }: { title: string; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mb-8', className)}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
        {icon && <Icon name={icon} className="text-accent" />} {title}
      </h2>
      {children}
    </section>
  );
}

export function ConfidenceBadge({ value }: { value: keyof typeof CONFIDENCE_META }) {
  const m = CONFIDENCE_META[value];
  const tone = m.tone === 'good' ? 'text-good' : m.tone === 'warn' ? 'text-warn' : 'text-muted';
  const icon: IconName = m.tone === 'good' ? 'check' : m.tone === 'warn' ? 'scales' : 'scroll';
  return (
    <span className={cx('chip', tone)} title={m.hint}>
      <Icon name={icon} size={13} /> {m.label}
    </span>
  );
}

export function EntityLink({ type, id, className, children }: { type: EntityType; id: string; className?: string; children?: ReactNode }) {
  const a = useAtlas();
  const exists = !!a.get(type, id);
  if (!exists) return <span className={className}>{children ?? id}</span>;
  return (
    <Link to={hrefFor(type, id)} className={cx('font-semibold text-accent underline decoration-accent/30 underline-offset-2 transition hover:decoration-accent', className)}>
      {children ?? labelFor(a, type, id)}
    </Link>
  );
}

export function EntityChips({ type, ids, max = 50 }: { type: EntityType; ids: string[]; max?: number }) {
  const a = useAtlas();
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.slice(0, max).map((id) =>
        type === 'tradition' ? (
          <TraditionChip key={id} id={id} />
        ) : (
          <Link key={id} to={hrefFor(type, id)} className="chip transition hover:border-accent hover:text-accent">
            {labelFor(a, type, id)}
          </Link>
        ),
      )}
    </div>
  );
}

export function TraditionChip({ id }: { id: string }) {
  const a = useAtlas();
  const t = a.get<Tradition>('tradition', id);
  if (!t) return <span className="chip">{id}</span>;
  const f = FAMILIES[t.family];
  return (
    <Link to={hrefFor('tradition', id)} className="chip transition hover:scale-[1.03]" style={{ borderColor: f.colour + '88' }} title={f.label}>
      <Icon name={f.icon} size={12} style={{ color: f.colour }} />
      {t.name}
    </Link>
  );
}

export function Sources({ ids }: { ids: string[] }) {
  const a = useAtlas();
  if (!ids.length) return null;
  return (
    <div className="mt-6 rounded-xl border border-dashed border-line p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-bold text-ink-2">
        <Icon name="book" size={15} /> Sources
      </div>
      <ul className="space-y-1 text-ink-2">
        {ids.map((id) => {
          const s = a.sources.find((x: Source) => x.id === id);
          if (!s) return <li key={id}>{id}</li>;
          return (
            <li key={id} className="flex gap-2">
              <span className="chip shrink-0 !py-0 !text-[10px] uppercase">{s.kind}</span>
              <span>
                {s.author && <>{s.author}, </>}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="italic text-accent hover:underline">
                    {s.title}
                  </a>
                ) : (
                  <i>{s.title}</i>
                )}
                {s.year && <> ({s.year})</>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CountUp({ to, duration = 1.2, className }: { to: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = to.toLocaleString(); return; }
    const c = animate(0, to, { duration, ease: 'easeOut', onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString(); } });
    return () => c.stop();
  }, [inView, to, duration, reduce]);
  // Render the real number first, so it is right even where the count-up animation never runs.
  return <span ref={ref} className={className}>{to.toLocaleString()}</span>;
}

export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/** Card with a soft gold glow that follows the pointer. */
export function GlowCard({ children, className, to, accent }: { children: ReactNode; className?: string; to?: string; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !ref.current) return;
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const inner = (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cx('card group relative h-full overflow-hidden p-5 transition-shadow hover:shadow-[0_18px_40px_-20px_rgb(var(--glow)/0.55)]', className)}
      style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(320px circle at var(--mx) var(--my), rgb(var(--glow) / 0.14), transparent 60%)' }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full rounded-2xl">{inner}</Link> : inner;
}

export function BookmarkButton({ type, id, label }: { type: EntityType; id: string; label: string }) {
  const has = useUi((s) => s.bookmarks.some((b) => b.type === type && b.id === id));
  const toggle = useUi((s) => s.toggleBookmark);
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      className={cx('btn', has && '!border-accent !text-accent')}
      onClick={() => toggle({ type, id, label })}
      aria-pressed={has}
    >
      <motion.span animate={has ? { scale: [1, 1.4, 1], rotate: [0, -12, 0] } : {}} transition={{ duration: 0.4 }}>
        <Icon name="bookmark" size={16} fill={has ? 'currentColor' : 'none'} />
      </motion.span>
      {has ? 'Saved' : 'Save'}
    </motion.button>
  );
}

export function CompareButton({ type, id }: { type: 'tradition' | 'position'; id: string }) {
  const has = useUi((s) => s.compare.some((c) => c.type === type && c.id === id));
  const toggle = useUi((s) => s.toggleCompare);
  return (
    <motion.button whileTap={{ scale: 0.9 }} className={cx('btn', has && '!border-accent !text-accent')} onClick={() => toggle({ type, id })} aria-pressed={has}>
      <Icon name={has ? 'check' : 'plus'} size={16} />
      {has ? 'In compare tray' : 'Compare'}
    </motion.button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, layoutId }: { tabs: { id: T; label: string; icon?: IconName }[]; value: T; onChange: (t: T) => void; layoutId: string }) {
  return (
    <div role="tablist" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', value === t.id ? 'text-accent-ink' : 'text-ink-2 hover:text-ink')}
        >
          {value === t.id && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative flex items-center gap-1.5">
            {t.icon && <Icon name={t.icon} size={15} />}
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function BulletList({ items, icon = 'arrow', tone }: { items: string[]; icon?: IconName; tone?: string }) {
  if (!items.length) return <p className="text-sm italic text-muted">Not yet written.</p>;
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-2 leading-relaxed text-ink-2">
          <Icon name={icon} size={15} className={cx('mt-1 shrink-0', tone ?? 'text-accent')} />
          <span>{t}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-10 text-center text-muted">{children}</div>;
}

export function useDebounced<T>(v: T, ms = 150) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function QuoteBlock({ text, kind, by, citation, to }: { text: string; kind: 'quotation' | 'paraphrase'; by?: ReactNode; citation?: string; to?: string }) {
  return (
    <figure className="card relative overflow-hidden p-5">
      <Icon name="quote" size={40} className="absolute -right-1 -top-1 text-accent opacity-10" />
      <blockquote className={cx('font-serif text-xl leading-snug text-ink', kind === 'quotation' && 'italic')}>
        {kind === 'quotation' ? `“${text}”` : text}
      </blockquote>
      <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        {kind === 'paraphrase' && <span className="chip !text-warn">Paraphrase</span>}
        {by && <span className="font-semibold text-ink-2">— {by}</span>}
        {citation && (to ? <Link to={to} className="italic hover:text-accent">{citation}</Link> : <span className="italic">{citation}</span>)}
      </figcaption>
    </figure>
  );
}
