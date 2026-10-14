import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Fuse from 'fuse.js';
import { Icon, type IconName } from './Icon';
import { useAtlas, hrefFor, type Atlas } from '../data/db';
import type { EntityType } from '../data/schema';
import { formatYear } from '../data/families';
import { cx, useDebounced } from './ui';

interface Doc { type: EntityType; id: string; title: string; sub: string; text: string }

const TYPE_META: Record<EntityType, { label: string; icon: IconName }> = {
  era: { label: 'Era', icon: 'hourglass' }, event: { label: 'Event', icon: 'timeline' }, person: { label: 'Person', icon: 'people' },
  work: { label: 'Writing', icon: 'book' }, quote: { label: 'Quote', icon: 'quote' }, doctrine: { label: 'Doctrine', icon: 'trinity' },
  position: { label: 'Position', icon: 'branch' }, tradition: { label: 'Tradition', icon: 'tree' }, controversy: { label: 'Debate', icon: 'scales' },
  experience: { label: 'Experience', icon: 'sparkles' }, comparison: { label: 'Comparison', icon: 'scales' }, path: { label: 'Study path', icon: 'compass' },
};

let cache: { atlas: Atlas; fuse: Fuse<Doc> } | undefined;
function getFuse(a: Atlas) {
  if (cache?.atlas === a) return cache.fuse;
  const docs: Doc[] = [
    ...a.eras.map((e) => ({ type: 'era' as const, id: e.id, title: e.name, sub: `${formatYear(e.startYear)}–${formatYear(e.endYear)}`, text: e.summary })),
    ...a.events.map((e) => ({ type: 'event' as const, id: e.id, title: e.title, sub: formatYear(e.year, e.circa), text: e.summary })),
    ...a.people.map((p) => ({ type: 'person' as const, id: p.id, title: p.name, sub: p.roles.slice(0, 2).join(', '), text: p.summary })),
    ...a.works.map((w) => ({ type: 'work' as const, id: w.id, title: w.title, sub: `${w.author ?? a.get<{ name: string }>('person', w.authorId ?? '')?.name ?? ''} · ${formatYear(w.year, w.circa)}`, text: w.summary })),
    ...a.quotes.map((q) => ({ type: 'quote' as const, id: q.id, title: q.text.slice(0, 90), sub: a.get<{ name: string }>('person', q.personId)?.name ?? '', text: q.topics.join(' ') })),
    ...a.doctrines.map((d) => ({ type: 'doctrine' as const, id: d.id, title: d.name, sub: d.question, text: d.summary })),
    ...a.positions.map((p) => ({ type: 'position' as const, id: p.id, title: p.name, sub: [a.doctrinesByPosition.get(p.id)?.name, ...p.altNames].filter(Boolean).join(' · '), text: p.oneLine })),
    ...a.traditions.map((t) => ({ type: 'tradition' as const, id: t.id, title: t.name, sub: `from ${formatYear(t.foundedYear)}`, text: t.summary })),
    ...a.controversies.map((c) => ({ type: 'controversy' as const, id: c.id, title: c.title, sub: c.question, text: c.summary })),
    ...a.experiences.map((x) => ({ type: 'experience' as const, id: x.id, title: x.title, sub: `${x.place.name} · ${formatYear(x.year, x.circa)}`, text: x.account })),
    ...a.comparisons.map((c) => ({ type: 'comparison' as const, id: c.id, title: c.title, sub: 'Featured comparison', text: c.summary })),
    ...a.paths.map((p) => ({ type: 'path' as const, id: p.id, title: p.title, sub: 'Study path', text: p.summary })),
  ];
  const fuse = new Fuse(docs, {
    keys: [{ name: 'title', weight: 3 }, { name: 'sub', weight: 1.2 }, { name: 'text', weight: 0.6 }],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  cache = { atlas: a, fuse };
  return fuse;
}

export function useSearchHotkey(setOpen: (fn: (o: boolean) => boolean) => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setOpen(() => true); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [setOpen]);
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Palette onClose={onClose} />}</AnimatePresence>;
}

function Palette({ onClose }: { onClose: () => void }) {
  const a = useAtlas();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const dq = useDebounced(q, 80);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (dq.trim().length < 2 ? [] : getFuse(a).search(dq, { limit: 40 }).map((r) => r.item)), [a, dq]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => setSel(0), [dq]);

  const go = (d: Doc) => { nav(hrefFor(d.type, d.id)); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[sel]) go(results[sel]);
  };
  useEffect(() => { document.getElementById(`sr-${sel}`)?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const suggestions = ['Nicaea', 'Augustine', 'Filioque', 'penal substitution', 'Azusa', 'theosis', 'rapture', 'Ethiopia', 'Chalcedon', 'Torrance'];

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-3 pt-[10vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="Search the atlas"
        className="card w-full max-w-2xl overflow-hidden shadow-2xl"
        initial={{ y: -20, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -10, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="text-accent" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search people, councils, doctrines, quotes…"
            className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
            aria-controls="search-results"
            aria-activedescendant={results[sel] ? `sr-${sel}` : undefined}
          />
          <kbd className="chip">Esc</kbd>
        </div>
        <div id="search-results" role="listbox" className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
          {dq.trim().length < 2 ? (
            <div className="p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Try</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} className="chip hover:border-accent hover:text-accent" onClick={() => setQ(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-muted">Nothing found for “{dq}”.</div>
          ) : (
            results.map((r, i) => (
              <motion.button
                id={`sr-${i}`}
                role="option"
                aria-selected={i === sel}
                key={r.type + r.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.015 }}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(r)}
                className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === sel && 'bg-surface-2')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-2 text-accent">
                  <Icon name={TYPE_META[r.type].icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.sub}</span>
                </span>
                <span className="chip shrink-0 !text-[10px]">{TYPE_META[r.type].label}</span>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
