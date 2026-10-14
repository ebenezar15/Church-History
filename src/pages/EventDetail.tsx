import { Link, useParams } from 'react-router-dom';
import { useAtlas } from '../data/db';
import type { Event } from '../data/schema';
import { CATEGORY_META, REGION_LABEL, formatSpan } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, ConfidenceBadge, EntityChips, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function EventDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const e = a.get<Event>('event', id);
  if (!e) return <NotFound />;
  const m = CATEGORY_META[e.category];
  const era = a.eraOf(e.year);
  const idx = a.events.findIndex((x) => x.id === id);
  const prev = a.events[idx - 1];
  const next = a.events[idx + 1];
  const splits = a.traditions.filter((t) => t.splitEventId === e.id);
  return (
    <div>
      <PageHeader eyebrow={`${m.label} · ${formatSpan(e.year, e.endYear, e.circa)}`} icon={m.icon} title={e.title} actions={<BookmarkButton type="event" id={e.id} label={e.title} />}>
        <p>{e.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ConfidenceBadge value={e.confidence} />
          {e.place && <span className="chip"><Icon name="map" size={12} /> {e.place.name}</span>}
          {era && <Link to={`/eras/${era.id}`} className="chip" style={{ borderColor: era.colour }}>{era.name}</Link>}
          {e.regions.map((r) => <span key={r} className="chip">{REGION_LABEL[r]}</span>)}
        </div>
      </PageHeader>
      {e.longText && (
        <article className="prose-atlas mb-8 max-w-3xl text-lg text-ink-2">
          {e.longText.split(/\n\n+/).map((p, i) => <p key={i} className={i === 0 ? 'illuminated' : ''}>{p}</p>)}
        </article>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Causes" icon="branch"><BulletList items={e.causes} /></Section>
        <Section title="Consequences" icon="split"><BulletList items={e.consequences} /></Section>
      </div>
      {splits.length > 0 && <Section title="Traditions that emerged" icon="tree"><EntityChips type="tradition" ids={splits.map((t) => t.id)} /></Section>}
      <div className="grid gap-6 md:grid-cols-3">
        {e.peopleIds.length > 0 && <Section title="People" icon="people"><EntityChips type="person" ids={e.peopleIds} /></Section>}
        {e.traditionIds.length > 0 && <Section title="Traditions" icon="tree"><EntityChips type="tradition" ids={e.traditionIds} /></Section>}
        {e.doctrineIds.length > 0 && <Section title="Doctrines" icon="trinity"><EntityChips type="doctrine" ids={e.doctrineIds} /></Section>}
      </div>
      <Sources ids={e.sources} />
      <div className="mt-8 flex justify-between gap-2">
        {prev ? <Link to={`/events/${prev.id}`} className="btn"><Icon name="arrow-left" size={15} /> {prev.title}</Link> : <span />}
        {next && <Link to={`/events/${next.id}`} className="btn">{next.title} <Icon name="arrow" size={15} /></Link>}
      </div>
    </div>
  );
}
