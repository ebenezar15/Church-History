import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Era } from '../data/schema';
import { CATEGORY_META, REGION_LABEL, formatYear, inkTone } from '../data/families';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader, cx } from '../components/ui';
import { ArchitectureDiagram } from '../components/Architecture';
import { NOW } from '../viz/river';

export const TOPIC_ICON: Record<string, IconName> = {
  worship: 'chalice', music: 'quill', architecture: 'layers', art: 'palette', monasticism: 'hourglass', calendar: 'timeline',
  women: 'people', education: 'book', missions: 'globe', persecution: 'flame', judaism: 'scroll', islam: 'star', state: 'crown',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } } };
const rise = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

export default function Eras() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const toggle = (id: string) => setParams(open === id ? {} : { open: id }, { replace: true });
  return (
    <div>
      <PageHeader eyebrow="Explore" icon="hourglass" title="Eras & Life in the Church">
        Thirteen eras, each with its events, people and a “Life in the Church” panel on worship, music, architecture, women, missions and more,
        East and West, North and South. Click an era to expand it here, or open its full page.
      </PageHeader>
      <LayoutGroup>
        <ol className="relative ml-3 border-l-2 border-line">
          {a.eras.map((e, i) => <EraItem key={e.id} e={e} i={i} open={open === e.id} onToggle={() => toggle(e.id)} />)}
        </ol>
      </LayoutGroup>
    </div>
  );
}

function EraItem({ e, i, open, onToggle }: { e: Era; i: number; open: boolean; onToggle: () => void }) {
  const a = useAtlas();
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280); }, [open]);
  const events = a.eventsByEra.get(e.id) ?? [];
  return (
    <motion.li ref={ref} layout initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: Math.min(i, 12) * 0.03 }} className="relative mb-6 scroll-mt-20 pl-8">
      <motion.span layout className="absolute -left-[11px] top-5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: e.colour }} animate={{ scale: open ? 1.3 : 1 }}>
        {i + 1}
      </motion.span>
      <motion.div layout className={cx('card overflow-hidden transition-shadow', open ? 'shadow-[0_24px_60px_-30px_rgb(var(--glow)/0.7)]' : 'hover:shadow-xl')} style={{ borderLeft: `4px solid ${e.colour}` }}>
        <motion.button layout="position" onClick={onToggle} aria-expanded={open} aria-controls={`era-${e.id}`} className="group block w-full p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold tabular-nums text-muted">{formatYear(e.startYear)} – {e.endYear >= NOW ? 'today' : formatYear(e.endYear)}</div>
              <h2 className="text-2xl font-bold transition group-hover:translate-x-1" style={{ color: inkTone(e.colour) }}>{e.name}</h2>
            </div>
            <motion.span animate={{ rotate: open ? 45 : 0 }} className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line', open ? 'text-white' : 'text-muted group-hover:border-accent group-hover:text-accent')} style={open ? { background: e.colour, borderColor: e.colour } : undefined} aria-hidden>
              <Icon name="plus" size={18} />
            </motion.span>
          </div>
          <p className="mt-1 max-w-3xl text-ink-2">{e.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1">{e.keyThemes.map((k) => <span key={k} className="chip">{k}</span>)}</div>
          <div className="mt-3 text-xs text-muted">{events.length} events · {e.globalNotes.length} notes beyond the West · {open ? 'click to close' : 'click to expand'}</div>
        </motion.button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div id={`era-${e.id}`} key="body" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: [0.3, 0, 0.2, 1] }} className="overflow-hidden">
              <EraExpanded e={e} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}

function EraExpanded({ e }: { e: Era }) {
  const a = useAtlas();
  const events = a.eventsByEra.get(e.id) ?? [];
  const culture = a.cultures.find((c) => c.eraId === e.id);
  const people = a.people.filter((p) => { const y = p.died ?? p.born; return y !== undefined && y >= e.startYear && y < e.endYear + 1; }).slice(0, 14);
  const [topic, setTopic] = useState<string | null>(culture?.panels[0]?.topic ?? null);
  const panel = culture?.panels.find((p) => p.topic === topic);
  const span = Math.max(1, Math.min(e.endYear, NOW) - e.startYear);
  const [hover, setHover] = useState<string | null>(null);
  const hv = events.find((x) => x.id === hover);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 border-t border-line px-5 pb-6 pt-5">
      {/* Timeline of the era's events */}
      <motion.section variants={rise}>
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="timeline" className="text-accent" /> Events of the era</h3>
        <div className="relative h-16 rounded-xl border border-line bg-surface-2">
          <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2" style={{ background: e.colour, opacity: 0.4 }} />
          {events.map((x, j) => {
            const m = CATEGORY_META[x.category];
            const left = 3 + ((Math.min(Math.max(x.year, e.startYear), Math.min(e.endYear, NOW)) - e.startYear) / span) * 94;
            return (
              <motion.div key={x.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 + j * 0.03, type: 'spring', stiffness: 400, damping: 18 }} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%` }}>
                <Link to={`/events/${x.id}`} onMouseEnter={() => setHover(x.id)} onFocus={() => setHover(x.id)} onMouseLeave={() => setHover(null)} className="block h-4 w-4 rounded-full ring-2 ring-surface transition-transform hover:scale-150" style={{ background: m.colour }} aria-label={`${formatYear(x.year, x.circa)}: ${x.title}`} />
              </motion.div>
            );
          })}
          <span className="absolute bottom-1 left-3 text-[10px] tabular-nums text-muted">{formatYear(e.startYear)}</span>
          <span className="absolute bottom-1 right-3 text-[10px] tabular-nums text-muted">{e.endYear >= NOW ? 'today' : formatYear(e.endYear)}</span>
        </div>
        <div className="mt-1 h-6 text-sm text-ink-2">{hv ? <><b className="tabular-nums">{formatYear(hv.year, hv.circa)}</b> · {hv.title}</> : <span className="text-muted">Point at a dot to see the event; click to open it.</span>}</div>
        <motion.ol variants={stagger} initial="hidden" animate="show" className="mt-2 grid gap-2 sm:grid-cols-2">
          {events.map((x) => {
            const m = CATEGORY_META[x.category];
            return (
              <motion.li key={x.id} variants={rise}>
                <Link to={`/events/${x.id}`} className="flex gap-3 rounded-xl border border-line p-3 transition hover:-translate-y-0.5 hover:border-accent">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2" style={{ color: m.colour }}><Icon name={m.icon} size={14} /></span>
                  <span className="min-w-0">
                    <span className="block text-xs tabular-nums text-muted">{formatYear(x.year, x.circa)}{x.place ? ` · ${x.place.name}` : ''}</span>
                    <span className="block font-semibold leading-snug">{x.title}</span>
                    <span className="line-clamp-2 block text-sm text-ink-2">{x.summary}</span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </motion.ol>
      </motion.section>

      {/* Life in the Church */}
      {culture && (
        <motion.section variants={rise}>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="chalice" className="text-accent" /> Life in the Church</h3>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {culture.panels.map((p) => (
                  <button key={p.topic} onClick={() => setTopic(p.topic)} aria-pressed={topic === p.topic} className={cx('chip cursor-pointer capitalize transition', topic === p.topic ? '!border-accent !bg-accent !text-accent-ink' : 'hover:border-accent')}>
                    <Icon name={TOPIC_ICON[p.topic] ?? 'star'} size={12} /> {p.topic}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {panel && (
                  <motion.div key={panel.topic} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="rounded-2xl border border-line bg-surface-2 p-5">
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><Icon name={TOPIC_ICON[panel.topic] ?? 'star'} size={14} /> {panel.topic}</div>
                    <h4 className="mb-2 text-lg font-bold">{panel.title}</h4>
                    <p className="leading-relaxed text-ink-2">{panel.text}</p>
                    {panel.regions.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{panel.regions.map((r) => <span key={r} className="chip !text-[10px]">{REGION_LABEL[r]}</span>)}</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ArchitectureDiagram kind={culture.architectureDiagram} />
          </div>
        </motion.section>
      )}

      {/* Beyond the West and people */}
      <motion.div variants={rise} className="grid gap-6 md:grid-cols-2">
        {e.globalNotes.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="globe" className="text-accent" /> Beyond the West</h3>
            <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {e.globalNotes.map((n, j) => (
                <motion.li key={j} variants={rise} className="rounded-xl border border-line p-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-accent">{REGION_LABEL[n.region]}</div>
                  <p className="text-sm leading-relaxed text-ink-2">{n.text}</p>
                </motion.li>
              ))}
            </motion.ul>
          </section>
        )}
        {people.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="people" className="text-accent" /> People of the era</h3>
            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap gap-2">
              {people.map((p) => (
                <motion.div key={p.id} variants={rise}>
                  <Link to={`/people/${p.id}`} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm transition hover:border-accent">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full font-serif font-semibold text-white" style={{ background: e.colour }}>{p.name.replace(/^(St\.?|Saint|Pope|Mar)\s+/, '')[0]}</span>
                    {p.name}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}
      </motion.div>

      <motion.div variants={rise} className="flex flex-wrap gap-2">
        <Link to={`/eras/${e.id}`} className="btn btn-primary">Open the full era <Icon name="arrow" size={15} /></Link>
        <Link to="/timeline" className="btn"><Icon name="timeline" size={15} /> See it on the master timeline</Link>
        <Link to="/map" className="btn"><Icon name="map" size={15} /> See it on the world map</Link>
      </motion.div>
    </motion.div>
  );
}
