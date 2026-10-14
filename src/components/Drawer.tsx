import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { useAtlas, hrefFor } from '../data/db';
import type { EntityType, Event, Person, Work, Experience, Presence, Position } from '../data/schema';
import { CATEGORY_META, formatSpan, formatYear } from '../data/families';
import { ConfidenceBadge, EntityChips } from './ui';

export function Drawer({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={title ?? 'Details'}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <button className="btn absolute right-4 top-4 !px-2" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              {children}
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Compact preview of any entity, used inside drawers. */
export function EntityPeek({ type, id, extra }: { type: EntityType | 'presence'; id: string; extra?: ReactNode }) {
  const a = useAtlas();
  if (type === 'presence') {
    const p = a.presences.find((x) => x.id === id) as Presence | undefined;
    if (!p) return null;
    return (
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">{p.kind.replace('-', ' ')} · {formatSpan(p.year, p.endYear)}</div>
        <h2 className="mb-2 text-2xl font-bold">{p.label}</h2>
        <div className="mb-3 text-sm text-muted">{p.place.name}</div>
        <p className="leading-relaxed text-ink-2">{p.note}</p>
        <div className="mt-3"><ConfidenceBadge value={p.confidence} /></div>
      </div>
    );
  }
  const e = a.get<Record<string, unknown>>(type, id);
  if (!e) return <p>Not found.</p>;
  let head: ReactNode = null;
  let body: ReactNode = null;
  if (type === 'event') {
    const ev = e as unknown as Event;
    const m = CATEGORY_META[ev.category];
    head = (<><span className="chip" style={{ color: m.colour }}><Icon name={m.icon} size={13} /> {m.label}</span><span className="chip">{formatSpan(ev.year, ev.endYear, ev.circa)}</span>{ev.place && <span className="chip">{ev.place.name}</span>}</>);
    body = (<><p className="leading-relaxed text-ink-2">{ev.summary}</p><div className="mt-3 space-y-2"><EntityChips type="person" ids={ev.peopleIds} /><EntityChips type="tradition" ids={ev.traditionIds} /></div></>);
  } else if (type === 'person') {
    const p = e as unknown as Person;
    head = <span className="chip">{formatSpan(p.born, p.died, p.circa)}</span>;
    body = (<><p className="leading-relaxed text-ink-2">{p.summary}</p><div className="mt-3"><EntityChips type="tradition" ids={p.traditionIds} /></div></>);
  } else if (type === 'work') {
    const w = e as unknown as Work;
    head = (<><span className="chip">{w.genre}</span><span className="chip">{formatYear(w.year, w.circa)}</span></>);
    body = <p className="leading-relaxed text-ink-2">{w.summary}</p>;
  } else if (type === 'experience') {
    const x = e as unknown as Experience;
    head = (<><span className="chip">{formatYear(x.year, x.circa)}</span><span className="chip">{x.place.name}</span></>);
    body = <p className="leading-relaxed text-ink-2">{x.account}</p>;
  } else if (type === 'position') {
    const p = e as unknown as Position;
    head = p.originYear !== undefined ? <span className="chip">from {formatYear(p.originYear)}</span> : null;
    body = <p className="leading-relaxed text-ink-2">{p.oneLine}</p>;
  } else {
    body = <p className="leading-relaxed text-ink-2">{String(e.summary ?? '')}</p>;
  }
  return (
    <div>
      <h2 className="mb-3 pr-10 text-2xl font-bold leading-tight">{String(e.title ?? e.name ?? id)}</h2>
      <div className="mb-4 flex flex-wrap gap-1.5">{head}</div>
      {body}
      {extra}
      <Link to={hrefFor(type, id)} className="btn btn-primary mt-6">Open full page <Icon name="arrow" size={16} /></Link>
    </div>
  );
}
