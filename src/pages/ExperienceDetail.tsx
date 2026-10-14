import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Experience } from '../data/schema';
import { formatSpan, formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, ConfidenceBadge, EntityChips, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function ExperienceDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const x = a.get<Experience>('experience', id);
  if (!x) return <NotFound />;
  const all = [...a.experiences].sort((p, q) => p.year - q.year);
  const idx = all.findIndex((e) => e.id === id);
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const paragraphs = (x.story ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

  return (
    <div>
      <PageHeader eyebrow={`${formatSpan(x.year, x.endYear, x.circa)} · ${x.place.name}`} icon="sparkles" title={x.title} actions={<BookmarkButton type="experience" id={x.id} label={x.title} />}>
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge value={x.confidence} />
          {x.phenomena.map((p) => <span key={p} className="chip capitalize">{p.replace(/-/g, ' ')}</span>)}
        </div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Section title="In brief" icon="scroll"><p className="text-lg leading-relaxed text-ink-2">{x.account}</p></Section>

          {paragraphs.length > 0 && (
            <Section title="The story" icon="book">
              <article className="prose-atlas max-w-[68ch] text-[1.05rem] text-ink-2">
                {paragraphs.map((p, i) => (
                  <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={i === 0 ? 'illuminated' : ''}>
                    {p}
                  </motion.p>
                ))}
              </article>
            </Section>
          )}

          {x.keyMoments.length > 0 && (
            <Section title="Key moments" icon="timeline">
              <ol className="relative space-y-4 border-l-2 border-accent/40 pl-6">
                {x.keyMoments.map((m, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                    <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent ring-4 ring-bg" />
                    {(m.date || m.year !== undefined) && <div className="text-xs font-bold uppercase tracking-widest text-accent">{m.date ?? formatYear(m.year)}</div>}
                    <p className="leading-relaxed text-ink-2">{m.text}</p>
                  </motion.li>
                ))}
              </ol>
            </Section>
          )}

          <Section title="Primary source" icon="quill">
            <div className="card p-4">
              <div className="font-bold">{x.primarySource.url ? <a className="text-accent hover:underline" href={x.primarySource.url} target="_blank" rel="noreferrer">{x.primarySource.title} <Icon name="external" size={13} className="inline" /></a> : x.primarySource.title}</div>
              <div className="text-sm italic text-muted">{x.primarySource.citation}</div>
            </div>
          </Section>
          <Section title="How contemporaries interpreted it" icon="people"><p className="leading-relaxed text-ink-2">{x.contemporaryInterpretation}</p></Section>
          <Section title="Assessments today" icon="scales">
            <div className="grid gap-3 sm:grid-cols-2">
              {x.assessments.map((s, i) => (
                <motion.div key={s.perspective} initial={{ opacity: 0, rotateY: 30 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: i * 0.08 }} style={{ transformPerspective: 800 }} className="card p-4">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">{s.perspective}</div>
                  <p className="text-sm leading-relaxed text-ink-2">{s.text}</p>
                </motion.div>
              ))}
            </div>
          </Section>
          {x.significance && (
            <Section title="Why it matters" icon="star">
              <p className="max-w-[68ch] rounded-2xl border border-line bg-surface-2 p-5 leading-relaxed text-ink-2">{x.significance}</p>
            </Section>
          )}
          {x.debates.length > 0 && <Section title="Debates: discernment, abuses, cessationism" icon="question"><BulletList items={x.debates} /></Section>}
        </div>
        <aside className="min-w-0">
          {x.personIds.length > 0 && <Section title="People" icon="people"><EntityChips type="person" ids={x.personIds} /></Section>}
          {x.traditionIds.length > 0 && <Section title="Traditions" icon="tree"><EntityChips type="tradition" ids={x.traditionIds} /></Section>}
          <Section title="Where" icon="map"><p className="text-sm text-ink-2">{x.place.name}</p><Link to="/map" className="text-sm text-accent underline">See it on the world map</Link></Section>
        </aside>
      </div>
      <Sources ids={x.sources} />
      <div className="mt-8 flex flex-wrap justify-between gap-2">
        {prev ? <Link to={`/experiences/${prev.id}`} className="btn"><Icon name="arrow-left" size={15} /> {prev.title}</Link> : <span />}
        {next && <Link to={`/experiences/${next.id}`} className="btn">{next.title} <Icon name="arrow" size={15} /></Link>}
      </div>
    </div>
  );
}
