import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { Genre } from '../data/schema';
import { formatYear, inkTone } from '../data/families';
import { Icon } from '../components/Icon';
import { PageHeader, cx, useDebounced } from '../components/ui';

export default function Library() {
  const a = useAtlas();
  const [genre, setGenre] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounced(q).toLowerCase();
  const byEra = useMemo(() => {
    const list = a.works.filter((w) => (!genre || w.genre === genre) && (!dq || w.title.toLowerCase().includes(dq) || (w.author ?? '').toLowerCase().includes(dq) || w.summary.toLowerCase().includes(dq))).sort((x, y) => x.year - y.year);
    return a.eras.map((e) => ({ era: e, works: list.filter((w) => a.eraOf(w.year)?.id === e.id) })).filter((g) => g.works.length);
  }, [a, genre, dq]);
  const genres = Genre.options.filter((g) => a.works.some((w) => w.genre === g));

  return (
    <div>
      <PageHeader eyebrow="Read" icon="book" title="Library">
        Creeds, letters, apologies, treatises, sermons, hymns and testimonies — arranged by era, with links to full public-domain texts.
      </PageHeader>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="btn flex-1 !justify-start sm:max-w-sm">
          <Icon name="search" className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter writings…" className="w-full bg-transparent outline-none" aria-label="Filter writings" />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !genre && '!border-accent !text-accent')} onClick={() => setGenre('')}>All</button>
        {genres.map((g) => <button key={g} className={cx('chip cursor-pointer capitalize', genre === g && '!border-accent !text-accent')} onClick={() => setGenre(g)}>{g}</button>)}
      </div>
      <AnimatePresence mode="popLayout">
        {byEra.map(({ era, works }) => (
          <motion.section layout key={era.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
            <h2 className="mb-3 text-lg font-bold" style={{ color: inkTone(era.colour) }}>{era.name}</h2>
            <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
              {works.map((w, i) => (
                <motion.div key={w.id} initial={{ opacity: 0, rotateY: -30 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} style={{ transformPerspective: 800 }} className="w-56 shrink-0">
                  <Link to={`/library/${w.id}`} className="group relative block h-72 overflow-hidden rounded-r-xl rounded-l-sm border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl" style={{ borderLeft: `10px solid ${era.colour}` }}>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{w.genre} · {formatYear(w.year, w.circa)}</div>
                    <h3 className="mb-1 font-serif text-xl font-semibold leading-tight group-hover:text-accent">{w.title}</h3>
                    <div className="mb-2 text-xs text-ink-2">{w.author ?? (w.authorId ? a.get<{ name: string }>('person', w.authorId)?.name : '')}</div>
                    <p className="line-clamp-5 text-xs leading-relaxed text-muted">{w.summary}</p>
                    {w.fullTextUrl && <span className="absolute bottom-3 left-4 chip !text-[10px]"><Icon name="external" size={10} /> full text</span>}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
