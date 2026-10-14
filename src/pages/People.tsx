import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { FAMILIES, REGION_LABEL, formatSpan } from '../data/families';
import type { Tradition } from '../data/schema';
import { Icon } from '../components/Icon';
import { PageHeader, cx, useDebounced } from '../components/ui';

export default function People() {
  const a = useAtlas();
  const [q, setQ] = useState('');
  const [era, setEra] = useState('');
  const [region, setRegion] = useState('');
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const dq = useDebounced(q).toLowerCase();
  const list = useMemo(() => {
    const e = a.eras.find((x) => x.id === era);
    return a.people
      .filter((p) => !dq || p.name.toLowerCase().includes(dq) || p.roles.join(' ').toLowerCase().includes(dq) || p.summary.toLowerCase().includes(dq))
      .filter((p) => { if (!e) return true; const y = p.died ?? p.born; return y !== undefined && y >= e.startYear && y <= e.endYear + 10; })
      .filter((p) => !region || p.regions.includes(region as never))
      .sort((x, y) => (sort === 'name' ? x.name.localeCompare(y.name) : (x.born ?? (x.died ?? 0) - 50) - (y.born ?? (y.died ?? 0) - 50)));
  }, [a, dq, era, region, sort]);

  return (
    <div>
      <PageHeader eyebrow="Read" icon="people" title="People">
        Theologians, martyrs, mystics, missionaries, rulers and reformers — with lifespans, ideas and who influenced whom.
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2">
        <label className="btn flex-1 !justify-start sm:max-w-sm">
          <Icon name="search" className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, role or idea…" className="w-full bg-transparent outline-none" aria-label="Filter people" />
        </label>
        <select className="btn" value={era} onChange={(e) => setEra(e.target.value)} aria-label="Era">
          <option value="">All eras</option>
          {a.eras.map((e) => <option key={e.id} value={e.id}>{e.short}</option>)}
        </select>
        <select className="btn" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="">All regions</option>
          {Object.entries(REGION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="btn" onClick={() => setSort((s) => (s === 'date' ? 'name' : 'date'))}>Sort: {sort === 'date' ? 'chronological' : 'A–Z'}</button>
      </div>
      <p className="mb-3 text-sm text-muted">{list.length} people</p>
      <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {list.map((p) => {
            const t = p.traditionIds.map((id) => a.get<Tradition>('tradition', id)).find(Boolean);
            const f = t ? FAMILIES[t.family] : undefined;
            return (
              <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
                <Link to={`/people/${p.id}`} className="card group flex h-full gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-xl font-semibold text-white transition group-hover:scale-110')} style={{ background: f?.colour ?? 'var(--accent)' }}>
                    {p.name.replace(/^(St\.?|Saint|Pope|Mar)\s+/, '')[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold leading-tight group-hover:text-accent">{p.name}</div>
                    <div className="text-xs tabular-nums text-muted">{formatSpan(p.born, p.died, p.circa)}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-ink-2">{p.roles.join(' · ')}</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
