import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { PageHeader, cx, useDebounced } from '../components/ui';

export default function Quotes() {
  const a = useAtlas();
  const loc = useLocation();
  const [topic, setTopic] = useState('');
  const [era, setEra] = useState('');
  const [author, setAuthor] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounced(q).toLowerCase();
  const topics = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of a.quotes) for (const t of x.topics) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 30).map(([t]) => t);
  }, [a.quotes]);
  const authors = useMemo(() => [...new Set(a.quotes.map((x) => x.personId))].map((id) => ({ id, name: a.get<{ name: string }>('person', id)?.name ?? id })).sort((x, y) => x.name.localeCompare(y.name)), [a]);
  const list = a.quotes.filter((x) => {
    if (topic && !x.topics.includes(topic)) return false;
    if (author && x.personId !== author) return false;
    if (era) { const y = x.year ?? a.get<{ died?: number }>('person', x.personId)?.died; if (y === undefined || a.eraOf(y)?.id !== era) return false; }
    if (dq && !x.text.toLowerCase().includes(dq)) return false;
    return true;
  });
  useEffect(() => {
    const h = loc.hash.slice(1);
    if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }, [loc.hash]);

  return (
    <div>
      <PageHeader eyebrow="Read" icon="quote" title="Quote Wall">
        Every quotation carries a full citation. Ancient and pre-1929 texts are quoted from public-domain translations; modern authors are paraphrased and labelled.
      </PageHeader>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="btn flex-1 !justify-start sm:max-w-sm">
          <Icon name="search" className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words…" className="w-full bg-transparent outline-none" aria-label="Search quotes" />
        </label>
        <select className="btn" value={era} onChange={(e) => setEra(e.target.value)} aria-label="Era"><option value="">All eras</option>{a.eras.map((e) => <option key={e.id} value={e.id}>{e.short}</option>)}</select>
        <select className="btn max-w-[200px]" value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Author"><option value="">All authors</option>{authors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </div>
      <div className="mb-6 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !topic && '!border-accent !text-accent')} onClick={() => setTopic('')}>All topics</button>
        {topics.map((t) => <button key={t} className={cx('chip cursor-pointer', topic === t && '!border-accent !text-accent')} onClick={() => setTopic(t === topic ? '' : t)}>{t}</button>)}
      </div>
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        <AnimatePresence>
          {list.map((x, i) => (
            <motion.figure
              layout
              id={x.id}
              key={x.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(i, 15) * 0.025 }}
              className={cx('card mb-4 break-inside-avoid p-5 transition hover:shadow-lg', loc.hash === `#${x.id}` && 'ring-2 ring-accent')}
            >
              <blockquote className={cx('font-serif text-xl leading-snug', x.kind === 'quotation' && 'italic')}>{x.kind === 'quotation' ? `“${x.text}”` : x.text}</blockquote>
              <figcaption className="mt-3 text-sm">
                <Link to={`/people/${x.personId}`} className="font-bold text-accent hover:underline">— {a.get<{ name: string }>('person', x.personId)?.name ?? x.personId}</Link>
                <div className="text-muted">
                  {x.workId ? <Link to={`/library/${x.workId}`} className="italic hover:text-accent">{x.citation}</Link> : <i>{x.citation}</i>}
                  {x.year !== undefined && <> · {formatYear(x.year)}</>}
                </div>
                {x.translation && <div className="text-xs text-muted">Tr. {x.translation}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {x.kind === 'paraphrase' && <span className="chip !text-warn">Paraphrase</span>}
                  {x.topics.slice(0, 4).map((t) => <button key={t} onClick={() => setTopic(t)} className="chip !text-[10px] hover:text-accent">{t}</button>)}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
