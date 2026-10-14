import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Experience } from '../data/schema';
import { formatSpan } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, ConfidenceBadge, EntityChips, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function ExperienceDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const x = a.get<Experience>('experience', id);
  if (!x) return <NotFound />;
  return (
    <div>
      <PageHeader eyebrow={`${formatSpan(x.year, x.endYear, x.circa)} · ${x.place.name}`} icon="sparkles" title={x.title} actions={<BookmarkButton type="experience" id={x.id} label={x.title} />}>
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge value={x.confidence} />
          {x.phenomena.map((p) => <span key={p} className="chip capitalize">{p.replace(/-/g, ' ')}</span>)}
        </div>
      </PageHeader>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <Section title="What was reported" icon="scroll"><p className="illuminated text-lg leading-relaxed text-ink-2">{x.account}</p></Section>
          <Section title="Primary source" icon="book">
            <div className="card p-4">
              <div className="font-bold">{x.primarySource.url ? <a className="text-accent hover:underline" href={x.primarySource.url} target="_blank" rel="noreferrer">{x.primarySource.title} <Icon name="external" size={13} className="inline" /></a> : x.primarySource.title}</div>
              <div className="text-sm italic text-muted">{x.primarySource.citation}</div>
            </div>
          </Section>
          <Section title="How contemporaries interpreted it" icon="people"><p className="leading-relaxed text-ink-2">{x.contemporaryInterpretation}</p></Section>
          <Section title="Assessments today" icon="scales">
            <div className="grid gap-3 sm:grid-cols-2">
              {x.assessments.map((s, i) => (
                <motion.div key={s.perspective} initial={{ opacity: 0, rotateY: 30 }} whileInView={{ opacity: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ transformPerspective: 800 }} className="card p-4">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">{s.perspective}</div>
                  <p className="text-sm leading-relaxed text-ink-2">{s.text}</p>
                </motion.div>
              ))}
            </div>
          </Section>
          {x.debates.length > 0 && <Section title="Debates: discernment, abuses, cessationism" icon="question"><BulletList items={x.debates} /></Section>}
        </div>
        <aside>
          {x.personIds.length > 0 && <Section title="People" icon="people"><EntityChips type="person" ids={x.personIds} /></Section>}
          {x.traditionIds.length > 0 && <Section title="Traditions" icon="tree"><EntityChips type="tradition" ids={x.traditionIds} /></Section>}
        </aside>
      </div>
      <Sources ids={x.sources} />
    </div>
  );
}
