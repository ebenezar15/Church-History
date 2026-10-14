import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Position } from '../data/schema';
import { formatYear } from '../data/families';
import { BookmarkButton, BulletList, CompareButton, ConfidenceBadge, EntityChips, EntityLink, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function PositionDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const p = a.get<Position>('position', id);
  if (!p) return <NotFound />;
  const d = a.doctrinesByPosition.get(p.id);
  return (
    <div>
      <PageHeader
        eyebrow={d ? `Position in ${d.name}` : 'Position'}
        icon="branch"
        title={p.name}
        actions={<><CompareButton type="position" id={p.id} /><BookmarkButton type="position" id={p.id} label={p.name} /></>}
      >
        <p>{p.oneLine}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {p.altNames.map((n) => <span key={n} className="chip">also: {n}</span>)}
          {p.originYear !== undefined && <span className="chip">from {formatYear(p.originYear)}</span>}
          <span className="chip capitalize">{p.standing.replace(/-/g, ' ')}</span>
          <ConfidenceBadge value={p.confidence} />
          {d && <EntityLink type="doctrine" id={d.id} className="chip !no-underline">← {d.name}</EntityLink>}
        </div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-good">In its adherents’ own terms</div>
          <Section title="Core claims" icon="check"><BulletList items={p.coreClaims} icon="check" tone="text-good" /></Section>
          <Section title="Strongest arguments" icon="scales"><BulletList items={p.strongestArguments} icon="arrow" tone="text-good" /></Section>
          <Section title="Key texts" icon="book"><div className="flex flex-wrap gap-1.5">{p.keyTexts.map((t) => <span key={t} className="chip">{t}</span>)}</div></Section>
          <Section title="Origin" icon="hourglass"><p className="leading-relaxed text-ink-2">{p.origin}</p></Section>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-bad">Critiques from other traditions</div>
          <Section title="Strongest objections" icon="question"><BulletList items={p.strongestObjections} icon="arrow" tone="text-bad" /></Section>
          <Section title="Responses to objections" icon="quote"><BulletList items={p.responses} icon="arrow" /></Section>
          <Section title="Practical consequences" icon="split"><BulletList items={p.consequences} icon="arrow" /></Section>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid gap-6 md:grid-cols-3">
        <Section title="Proponents" icon="people">
          <EntityChips type="person" ids={p.proponentIds} />
          {p.proponentsOther.length > 0 && <p className="mt-2 text-sm text-muted">{p.proponentsOther.join(' · ')}</p>}
        </Section>
        <Section title="Held by" icon="tree"><EntityChips type="tradition" ids={p.traditionIds} /></Section>
        <Section title="Related positions" icon="branch"><EntityChips type="position" ids={p.relatedPositionIds} /></Section>
      </motion.div>
      <Sources ids={p.sources} />
    </div>
  );
}
