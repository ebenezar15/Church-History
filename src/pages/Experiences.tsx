import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { Phenomenon } from '../data/schema';
import { formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { ConfidenceBadge, PageHeader, Tabs, cx } from '../components/ui';
import { NOW } from '../viz/river';

export default function Experiences() {
  const a = useAtlas();
  const [ph, setPh] = useState('');
  const [view, setView] = useState<'cards' | 'timeline'>('cards');
  const list = useMemo(() => a.experiences.filter((x) => !ph || x.phenomena.includes(ph as never)).sort((p, q) => p.year - q.year), [a, ph]);
  const phen = Phenomenon.options.filter((p) => a.experiences.some((x) => x.phenomena.includes(p)));

  return (
    <div>
      <PageHeader eyebrow="Read" icon="sparkles" title="Mystical, Ecstatic & Supernatural Experience">
        Visions, tongues, healings, trembling, holy laughter and revival — presented descriptively: what was reported, by whom,
        the primary source, how contemporaries read it, and how different traditions and historians assess it today.
        For locations, open the <Link to="/map" className="text-accent underline">world map</Link> with the Experiences layer.
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs layoutId="exp-tabs" value={view} onChange={setView} tabs={[{ id: 'cards', label: 'Cards', icon: 'layers' }, { id: 'timeline', label: 'Timeline', icon: 'timeline' }]} />
      </div>
      <div className="mb-6 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !ph && '!border-accent !text-accent')} onClick={() => setPh('')}>All</button>
        {phen.map((p) => <button key={p} className={cx('chip cursor-pointer capitalize', ph === p && '!border-accent !text-accent')} onClick={() => setPh(p)}>{p.replace(/-/g, ' ')}</button>)}
      </div>
      {view === 'cards' ? (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {list.map((x, i) => (
              <motion.div layout key={x.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <Link to={`/experiences/${x.id}`} className="card group relative block h-full overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-xl">
                  <motion.div className="absolute -right-6 -top-6 text-accent opacity-10" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
                    <Icon name="sparkles" size={90} />
                  </motion.div>
                  <div className="text-xs font-bold tabular-nums text-muted">{formatYear(x.year, x.circa)} · {x.place.name}</div>
                  <h2 className="mb-2 text-lg font-bold leading-snug group-hover:text-accent">{x.title}</h2>
                  <p className="mb-3 line-clamp-3 text-sm text-ink-2">{x.account}</p>
                  <div className="flex flex-wrap gap-1">
                    <ConfidenceBadge value={x.confidence} />
                    {x.phenomena.slice(0, 3).map((p) => <span key={p} className="chip capitalize">{p.replace(/-/g, ' ')}</span>)}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="card scrollbar-thin overflow-x-auto p-4">
          <div className="relative h-[420px] min-w-[900px]">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-line" />
            {list.map((x, i) => {
              const left = ((x.year - 0) / (NOW - 0)) * 100;
              const up = i % 2 === 0;
              const lane = (i % 6) >> 1;
              return (
                <motion.div key={x.id} initial={{ opacity: 0, y: up ? 20 : -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="absolute" style={{ left: `${left}%`, top: up ? `${8 + lane * 55}px` : undefined, bottom: up ? undefined : `${8 + lane * 55}px` }}>
                  <Link to={`/experiences/${x.id}`} className="chip -translate-x-1/2 !bg-surface shadow-sm hover:!border-accent hover:text-accent" title={x.title}>
                    {formatYear(x.year)} {x.title.length > 22 ? x.title.slice(0, 21) + '…' : x.title}
                  </Link>
                </motion.div>
              );
            })}
            {[0, 500, 1000, 1500, 2000].map((y) => <div key={y} className="absolute top-1/2 mt-2 -translate-x-1/2 text-xs text-muted" style={{ left: `${(y / NOW) * 100}%` }}>{y || 'AD 1'}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
