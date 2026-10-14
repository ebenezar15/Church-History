import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas, hrefFor, labelFor } from '../data/db';
import type { FlowNode, Quote } from '../data/schema';
import { DoctrineFlow } from '../viz/DoctrineFlow';
import { DoctrineStory } from '../viz/DoctrineStory';
import { Drawer } from '../components/Drawer';
import { FLOW_KIND_META, formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, CompareButton, GlowCard, PageHeader, QuoteBlock, Sources, Tabs, cx } from '../components/ui';
import { PositionCompareTable } from '../components/PositionTable';
import { DOCTRINE_ICON } from './Doctrines';
import NotFound from './NotFound';

type Tab = 'flow' | 'positions' | 'compare' | 'debates' | 'about';

export default function DoctrineDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const d = a.doctrines.find((x) => x.id === id);
  const [tab, setTab] = useState<Tab>('flow');
  // Phones get the readable step-by-step story by default; the interactive chart is one tap away.
  const narrow = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
  const [view, setView] = useState<'chart' | 'story'>(narrow ? 'story' : 'chart');
  const [node, setNode] = useState<FlowNode | undefined>();
  const positions = a.positionsByDoctrine.get(id) ?? [];
  const [pair, setPair] = useState<[string, string]>(['', '']);
  if (!d) return <NotFound />;
  const debates = a.controversiesByDoctrine.get(id) ?? [];
  const cmp: [string, string] = [pair[0] || positions[0]?.id || '', pair[1] || positions[1]?.id || ''];

  return (
    <div>
      <PageHeader eyebrow="Doctrine" icon={DOCTRINE_ICON[d.icon]} title={d.name} actions={<BookmarkButton type="doctrine" id={d.id} label={d.name} />}>
        <p className="font-serif text-2xl italic">“{d.question}”</p>
        <p className="mt-2">{d.summary}</p>
      </PageHeader>

      <div className="mb-5">
        <Tabs<Tab>
          layoutId="doc-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'flow', label: 'Skeleton', icon: 'branch' },
            { id: 'positions', label: `Positions (${positions.length})`, icon: 'layers' },
            { id: 'compare', label: 'Compare two', icon: 'scales' },
            { id: 'debates', label: `Debates (${debates.length})`, icon: 'quote' },
            { id: 'about', label: 'History', icon: 'scroll' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {tab === 'flow' && (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-line bg-surface-2 p-1" role="group" aria-label="View">
                  {([['story', 'Story view', 'scroll'], ['chart', 'Flowchart', 'branch']] as const).map(([v, l, ic]) => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx('relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', view === v ? 'text-accent-ink' : 'text-ink-2')}>
                      {view === v && <motion.span layoutId="doc-view" className="absolute inset-0 rounded-lg bg-accent" />}
                      <span className="relative flex items-center gap-1.5"><Icon name={ic} size={14} /> {l}</span>
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted">{d.flow.nodes.length} steps from {formatYear(Math.min(...d.flow.nodes.map((n) => n.year ?? 9999)))} to today</span>
              </div>
              {view === 'story' ? (
                <DoctrineStory doctrine={d} />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="card h-[72vh] min-h-[420px] overflow-hidden">
                    <DoctrineFlow doctrine={d} selectedId={node?.id} onSelect={setNode} />
                  </div>
                  <div className="hidden lg:block"><NodePanel node={node} /></div>
                  {/* On smaller screens a tapped node opens in a slide-up panel instead of far below the chart. */}
                  <div className="lg:hidden">
                    <Drawer open={!!node} onClose={() => setNode(undefined)} title={node?.label}>
                      <NodePanel node={node} bare />
                    </Drawer>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'positions' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {positions.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <GlowCard>
                    <Link to={hrefFor('position', p.id)} className="text-lg font-bold hover:text-accent">{p.name}</Link>
                    <div className="mb-2 text-xs text-muted">{p.originYear !== undefined && `from ${formatYear(p.originYear)} · `}{p.standing.replace(/-/g, ' ')}</div>
                    <p className="mb-3 text-sm leading-relaxed text-ink-2">{p.oneLine}</p>
                    <CompareButton type="position" id={p.id} />
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          )}
          {tab === 'compare' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {[0, 1].map((i) => (
                  <select key={i} className="btn" value={cmp[i]} onChange={(e) => setPair((p) => (i === 0 ? [e.target.value, p[1] || cmp[1]] : [p[0] || cmp[0], e.target.value]))} aria-label={`Position ${i + 1}`}>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ))}
                <button className="btn" onClick={() => setPair([cmp[1], cmp[0]])} aria-label="Swap"><Icon name="shuffle" /></button>
              </div>
              <PositionCompareTable key={cmp.join()} ids={cmp} />
            </div>
          )}
          {tab === 'debates' && (
            <div className="grid gap-4 md:grid-cols-2">
              {debates.length === 0 && <p className="text-muted">No debates written yet for this doctrine.</p>}
              {debates.map((c) => (
                <GlowCard key={c.id} to={hrefFor('controversy', c.id)}>
                  <h3 className="text-lg font-bold">{c.title}</h3>
                  <p className="mb-2 font-serif text-lg italic text-ink-2">{c.question}</p>
                  <div className="flex flex-wrap gap-1">{c.sides.map((s) => <span key={s.name} className="chip">{s.name}</span>)}</div>
                </GlowCard>
              ))}
            </div>
          )}
          {tab === 'about' && (
            <article className="card prose-atlas max-w-3xl p-6 text-ink-2">
              {(d.longText ?? d.summary).split(/\n\n+/).map((para, i) => <p key={i} className={i === 0 ? 'illuminated' : ''}>{para}</p>)}
              <Sources ids={d.sources} />
            </article>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function NodePanel({ node, bare = false }: { node?: FlowNode; bare?: boolean }) {
  const a = useAtlas();
  return (
    <aside className={bare ? '' : 'card scrollbar-thin max-h-[72vh] overflow-y-auto p-5'} aria-live="polite">
      <AnimatePresence mode="wait">
        {!node ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted">
            <Icon name="info" className="mb-2 text-accent" size={28} />
            <p className="mb-3">Click any node to read its full text, linked people and quotations.</p>
            <p>Press <b className="text-ink-2">Play the development</b> to watch the doctrine take shape century by century.</p>
            <div className="mt-4 space-y-1.5">
              {Object.values(FLOW_KIND_META).map((m) => (
                <div key={m.label} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: m.colour }} /><Icon name={m.icon} size={13} style={{ color: m.colour }} /> {m.label}</div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={node.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: FLOW_KIND_META[node.kind].colour }}>
              <Icon name={FLOW_KIND_META[node.kind].icon} size={14} /> {FLOW_KIND_META[node.kind].label}
              {node.year !== undefined && <span className="ml-auto text-muted">{formatYear(node.year)}</span>}
            </div>
            <h3 className="mb-3 text-xl font-bold leading-snug">{node.label}</h3>
            {node.text && <p className="mb-4 leading-relaxed text-ink-2">{node.text}</p>}
            {node.ref && (
              <Link to={hrefFor(node.ref.type, node.ref.id)} className={cx('btn mb-4')}>
                Open {labelFor(a, node.ref.type, node.ref.id)} <Icon name="arrow" size={15} />
              </Link>
            )}
            <div className="space-y-3">
              {node.quoteIds.map((qid) => {
                const q = a.get<Quote>('quote', qid);
                if (!q) return null;
                return <QuoteBlock key={qid} text={q.text} kind={q.kind} by={labelFor(a, 'person', q.personId)} citation={q.citation} />;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
