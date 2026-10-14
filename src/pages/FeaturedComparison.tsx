import { Fragment, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Comparison } from '../data/schema';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, EntityChips, PageHeader, Section, Sources, Tabs, cx } from '../components/ui';
import NotFound from './NotFound';

const COLS = ['#3a6fc2', '#c2453a', '#2f7d4a', '#7a4fc2'];

export default function FeaturedComparison() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const c = a.get<Comparison>('comparison', id);
  const [tab, setTab] = useState<'table' | 'overlap' | 'critiques' | 'practice'>('table');
  const [focus, setFocus] = useState<number | null>(null);
  if (!c) return <NotFound />;
  const colour = (i: number) => c.columns[i].colour ?? COLS[i % 4];

  return (
    <div>
      <PageHeader eyebrow="Featured comparison" icon="scales" title={c.title} actions={<BookmarkButton type="comparison" id={c.id} label={c.title} />}>
        <p>{c.summary}</p>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {c.columns.map((col, i) => (
          <motion.button
            key={col.name}
            onClick={() => setFocus((f) => (f === i ? null : i))}
            initial={{ opacity: 0, x: i === 0 ? -50 : 50 }}
            animate={{ opacity: focus === null || focus === i ? 1 : 0.45, x: 0, scale: focus === i ? 1.02 : 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="card p-5 text-left"
            style={{ borderTop: `5px solid ${colour(i)}` }}
            aria-pressed={focus === i}
          >
            <h2 className="text-2xl font-bold" style={{ color: colour(i) }}>{col.name}</h2>
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              <EntityChips type="position" ids={col.positionIds} />
              <EntityChips type="person" ids={col.proponentIds} max={14} />
            </div>
            <div className="mt-2 text-xs text-muted">Click to {focus === i ? 'unfocus' : 'focus this column'}</div>
          </motion.button>
        ))}
      </div>

      <div className="mb-5"><Tabs layoutId="feat-tabs" value={tab} onChange={setTab} tabs={[{ id: 'table', label: 'Side by side', icon: 'layers' }, { id: 'overlap', label: 'Overlap & difference', icon: 'branch' }, { id: 'critiques', label: 'Critiques', icon: 'question' }, { id: 'practice', label: 'In practice', icon: 'people' }]} /></div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          {tab === 'table' && (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="grid min-w-[640px] gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm" style={{ gridTemplateColumns: `170px repeat(${c.columns.length}, 1fr)` }}>
                <div className="bg-surface-2 p-3" />
                {c.columns.map((col, i) => <div key={col.name} className="bg-surface-2 p-3 font-bold" style={{ color: colour(i) }}>{col.name}</div>)}
                {c.rows.map((r, ri) => (
                  <Fragment key={r.topic}>
                    <div className="bg-surface p-3 font-bold text-ink-2">{r.topic}</div>
                    {r.cells.map((cell, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: focus === null || focus === i ? 1 : 0.35 }} transition={{ delay: ri * 0.03 }} className="bg-surface p-3 leading-relaxed text-ink-2">{cell}</motion.div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
          {tab === 'overlap' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card p-5"><Section title="Where they genuinely overlap" icon="check"><BulletList items={c.overlaps} icon="check" tone="text-good" /></Section></div>
              <div className="card p-5"><Section title="Where they differ" icon="split"><BulletList items={c.differences} icon="split" tone="text-bad" /></Section></div>
            </div>
          )}
          {tab === 'critiques' && (
            <div className="grid gap-6 md:grid-cols-2">
              {c.columns.map((col, i) => (
                <div key={col.name} className="card p-5" style={{ borderTop: `4px solid ${colour(i)}` }}>
                  <Section title={`Critiques of the ${col.name.toLowerCase()}`} icon="question"><BulletList items={c.critiques[i] ?? []} icon="question" /></Section>
                </div>
              ))}
            </div>
          )}
          {tab === 'practice' && (
            <div className="space-y-4">
              {c.practical.map((p, pi) => (
                <motion.div key={p.area} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.06 }} className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="people" className="text-accent" /> {p.area}</h3>
                  <div className={cx('grid gap-4', c.columns.length > 1 && 'md:grid-cols-2')}>
                    {p.cells.map((cell, i) => (
                      <div key={i} className="border-l-4 pl-3 text-sm leading-relaxed text-ink-2" style={{ borderColor: colour(i) }}>{cell}</div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <Sources ids={c.sources} />
    </div>
  );
}
