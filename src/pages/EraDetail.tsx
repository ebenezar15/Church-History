import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { CATEGORY_META, REGION_LABEL, WESTERN_REGIONS, formatYear, inkTone } from '../data/families';
import { Icon, type IconName } from '../components/Icon';
import { GlowCard, PageHeader, Section, Sources, Tabs, cx } from '../components/ui';
import { ArchitectureDiagram } from '../components/Architecture';
import { NOW } from '../viz/river';
import NotFound from './NotFound';

const TOPIC_ICON: Record<string, IconName> = {
  worship: 'chalice', music: 'quill', architecture: 'layers', art: 'palette', monasticism: 'hourglass', calendar: 'timeline',
  women: 'people', education: 'book', missions: 'globe', persecution: 'flame', judaism: 'scroll', islam: 'star', state: 'crown',
};

export default function EraDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const idx = a.eras.findIndex((e) => e.id === id);
  const era = a.eras[idx];
  const [tab, setTab] = useState<'events' | 'life' | 'world'>('events');
  const [region, setRegion] = useState<'all' | 'beyond'>('all');
  if (!era) return <NotFound />;
  const prev = a.eras[idx - 1];
  const next = a.eras[idx + 1];
  const events = (a.eventsByEra.get(era.id) ?? []).filter((e) => region === 'all' || e.regions.some((r) => !WESTERN_REGIONS.has(r)));
  const culture = a.cultures.find((c) => c.eraId === era.id);
  const people = a.people.filter((p) => { const mid = p.died ?? p.born; return mid !== undefined && mid >= era.startYear && mid < era.endYear + 1; });

  return (
    <div>
      <motion.div key={era.id} initial={{ rotateY: -12, opacity: 0, x: 40 }} animate={{ rotateY: 0, opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: [0.3, 0, 0.2, 1] }} style={{ transformPerspective: 1400, transformOrigin: 'left center' }}>
        <PageHeader eyebrow={`Era ${era.order} · ${formatYear(era.startYear)} – ${era.endYear >= NOW ? 'today' : formatYear(era.endYear)}`} icon="hourglass" title={<span style={{ color: inkTone(era.colour) }}>{era.name}</span>}>
          <p>{era.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1">{era.keyThemes.map((k) => <span key={k} className="chip">{k}</span>)}</div>
        </PageHeader>
      </motion.div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs layoutId="era-tabs" value={tab} onChange={setTab} tabs={[{ id: 'events', label: 'Events & people', icon: 'timeline' }, { id: 'life', label: 'Life in the Church', icon: 'chalice' }, { id: 'world', label: 'Beyond the West', icon: 'globe' }]} />
        <div className="flex gap-2">
          {prev && <Link to={`/eras/${prev.id}`} className="btn"><Icon name="arrow-left" size={15} /> {prev.short}</Link>}
          {next && <Link to={`/eras/${next.id}`} className="btn">{next.short} <Icon name="arrow" size={15} /></Link>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'events' && (
            <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="mb-3 flex gap-1">
                  <button className={cx('chip cursor-pointer', region === 'all' && '!border-accent !text-accent')} onClick={() => setRegion('all')}>All regions</button>
                  <button className={cx('chip cursor-pointer', region === 'beyond' && '!border-accent !text-accent')} onClick={() => setRegion('beyond')}>Beyond Western Europe</button>
                </div>
                <ol className="relative space-y-3 border-l-2 pl-6" style={{ borderColor: era.colour }}>
                  {events.map((e, i) => {
                    const m = CATEGORY_META[e.category];
                    return (
                      <motion.li key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 20) * 0.03 }} className="relative">
                        <span className="absolute -left-[33px] top-4 flex h-5 w-5 items-center justify-center rounded-full bg-surface ring-2" style={{ color: m.colour, ['--tw-ring-color' as string]: m.colour }}>
                          <Icon name={m.icon} size={11} />
                        </span>
                        <Link to={`/events/${e.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <b className="tabular-nums">{formatYear(e.year, e.circa)}</b>
                            <span style={{ color: m.colour }}>{m.label}</span>
                            {e.place && <span>· {e.place.name}</span>}
                          </div>
                          <div className="font-bold">{e.title}</div>
                          <p className="mt-1 line-clamp-2 text-sm text-ink-2">{e.summary}</p>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ol>
              </div>
              <aside>
                <Section title="People of the era" icon="people">
                  <div className="space-y-1.5">
                    {people.map((p) => (
                      <Link key={p.id} to={`/people/${p.id}`} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-xs tabular-nums text-muted">{p.died !== undefined ? `d. ${formatYear(p.died)}` : ''}</span>
                      </Link>
                    ))}
                  </div>
                </Section>
              </aside>
            </div>
          )}
          {tab === 'life' && (
            culture ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  {culture.panels.map((p, i) => (
                    <motion.div key={p.topic + i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <GlowCard>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><Icon name={TOPIC_ICON[p.topic] ?? 'star'} size={14} /> {p.topic}</div>
                        <h3 className="mb-1 font-bold">{p.title}</h3>
                        <p className="text-sm leading-relaxed text-ink-2">{p.text}</p>
                        {p.regions.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{p.regions.map((r) => <span key={r} className="chip !text-[10px]">{REGION_LABEL[r]}</span>)}</div>}
                      </GlowCard>
                    </motion.div>
                  ))}
                </div>
                <aside className="space-y-4">
                  <ArchitectureDiagram kind={culture.architectureDiagram} />
                  <Sources ids={culture.sources} />
                </aside>
              </div>
            ) : <p className="text-muted">The Life in the Church panel for this era has not been written yet.</p>
          )}
          {tab === 'world' && (
            <div className="grid gap-4 md:grid-cols-2">
              {era.globalNotes.map((n, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="card p-5">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><Icon name="globe" size={14} /> {REGION_LABEL[n.region]}</div>
                  <p className="leading-relaxed text-ink-2">{n.text}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
