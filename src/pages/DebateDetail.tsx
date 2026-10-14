import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Controversy, Quote } from '../data/schema';
import { formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, EntityChips, PageHeader, QuoteBlock, Section, Sources, cx } from '../components/ui';
import NotFound from './NotFound';

const SIDE_COLOURS = ['#3a6fc2', '#c2453a', '#2f7d4a', '#7a4fc2'];

export default function DebateDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const c = a.get<Controversy>('controversy', id);
  const [steelman, setSteelman] = useState(true);
  const [round, setRound] = useState<'case' | 'counter'>('case');
  if (!c) return <NotFound />;
  return (
    <div>
      <PageHeader eyebrow="Debate Arena" icon="scales" title={c.title} actions={<BookmarkButton type="controversy" id={c.id} label={c.title} />}>
        <p className="font-serif text-2xl italic">{c.question}</p>
        <p className="mt-2">{c.summary}</p>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <button role="switch" aria-checked={steelman} onClick={() => setSteelman((s) => !s)} className={cx('relative h-6 w-11 rounded-full transition', steelman ? 'bg-accent' : 'bg-line')}>
            <motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow" style={{ left: steelman ? 22 : 2 }} />
          </button>
          Steelman: each side in its own voice
        </label>
        <div className="ml-auto flex rounded-xl border border-line bg-surface-2 p-1">
          {(['case', 'counter'] as const).map((r) => (
            <button key={r} onClick={() => setRound(r)} className={cx('relative rounded-lg px-3 py-1 text-sm font-semibold', round === r ? 'text-accent-ink' : 'text-ink-2')}>
              {round === r && <motion.span layoutId="round" className="absolute inset-0 rounded-lg bg-accent" />}
              <span className="relative">{r === 'case' ? 'Round 1 · The case' : 'Round 2 · Rebuttals'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-10 grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` }}>
        {c.sides.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20, delay: i * 0.1 }}
            className="card overflow-hidden"
            style={{ borderTop: `5px solid ${SIDE_COLOURS[i % 4]}` }}
          >
            <div className="p-5">
              <h2 className="text-xl font-bold" style={{ color: SIDE_COLOURS[i % 4] }}>{s.name}</h2>
              {s.positionId && <Link to={`/positions/${s.positionId}`} className="text-xs text-muted hover:text-accent">Full position page →</Link>}
              <AnimatePresence mode="wait">
                <motion.div key={round + String(steelman)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-3">
                  {round === 'case' ? (
                    <>
                      {steelman && <blockquote className="mb-4 border-l-4 pl-3 font-serif text-lg italic leading-snug text-ink" style={{ borderColor: SIDE_COLOURS[i % 4] }}>{s.steelman}</blockquote>}
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Arguments</div>
                      <BulletList items={s.arguments} icon="check" tone="text-good" />
                    </>
                  ) : (
                    <>
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Counter-arguments it faces</div>
                      <BulletList items={s.counterArguments} icon="question" tone="text-bad" />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
              {s.keyTexts.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Key texts</div>
                  <div className="flex flex-wrap gap-1">{s.keyTexts.map((t) => <span key={t} className="chip">{t}</span>)}</div>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {s.quoteIds.map((qid) => { const q = a.get<Quote>('quote', qid); return q ? <QuoteBlock key={qid} text={q.text} kind={q.kind} by={a.get<{ name: string }>('person', q.personId)?.name} citation={q.citation} /> : null; })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {c.timeline.length > 0 && (
          <Section title="How the debate unfolded" icon="timeline">
            <ol className="relative space-y-3 border-l-2 border-accent pl-5">
              {c.timeline.map((t, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-accent" />
                  <b className="tabular-nums">{formatYear(t.year)}</b> — <span className="text-ink-2">{t.text}</span>
                  {t.eventId && <Link to={`/events/${t.eventId}`} className="ml-1 text-accent"><Icon name="arrow" size={13} className="inline" /></Link>}
                </motion.li>
              ))}
            </ol>
          </Section>
        )}
        <div>
          <Section title="Outcome" icon="scroll">
            <div className="card p-4">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">{c.resolution.kind}</div>
              <p className="leading-relaxed text-ink-2">{c.resolution.text}</p>
            </div>
          </Section>
          <Section title="Consequences" icon="split"><BulletList items={c.consequences} /></Section>
          {c.doctrineIds.length > 0 && <Section title="Doctrines" icon="trinity"><EntityChips type="doctrine" ids={c.doctrineIds} /></Section>}
        </div>
      </div>
      <Sources ids={c.sources} />
    </div>
  );
}
