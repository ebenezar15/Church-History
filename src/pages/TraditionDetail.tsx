import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Event, Tradition } from '../data/schema';
import { FAMILIES, REGION_LABEL, formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, CompareButton, CountUp, EntityChips, EntityLink, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function TraditionDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const t = a.get<Tradition>('tradition', id);
  if (!t) return <NotFound />;
  const f = FAMILIES[t.family];
  const split = t.splitEventId ? a.get<Event>('event', t.splitEventId) : undefined;
  const children = a.childrenOf.get(t.id) ?? [];
  const people = a.peopleByTradition.get(t.id) ?? [];
  const positions = a.positions.filter((p) => p.traditionIds.includes(t.id));
  const events = a.events.filter((e) => e.traditionIds.includes(t.id));

  return (
    <div>
      <PageHeader
        eyebrow={f.label}
        icon={f.icon}
        title={<span style={{ color: f.colour }}>{t.name}</span>}
        actions={<><CompareButton type="tradition" id={t.id} /><BookmarkButton type="tradition" id={t.id} label={t.name} /></>}
      >
        <p>{t.summary}</p>
        {t.family === 'nontrinitarian' && (
          <p className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <Icon name="info" size={14} className="mr-1 inline text-accent" />
            Described neutrally here; this movement stands outside the historic Nicene (Trinitarian) consensus shared by Catholic, Orthodox and Protestant churches.
          </p>
        )}
      </PageHeader>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">Emerged</div>
          <div className="text-2xl font-bold">{formatYear(t.foundedYear)}{t.endYear ? ` – ${formatYear(t.endYear)}` : ''}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">Adherents</div>
          {t.adherents ? (
            <>
              <div className="text-2xl font-bold">~<CountUp to={Math.round(t.adherents.estimate / 1e6)} /> million</div>
              <div className="text-xs text-muted">{t.adherents.source}, {t.adherents.year}</div>
            </>
          ) : <div className="text-lg text-muted">—</div>}
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">Status</div>
          <div className="text-sm font-semibold leading-snug">{t.status}</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Section title="Distinctives" icon="star"><BulletList items={t.distinctives} /></Section>
          <Section title="Profile" icon="layers">
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(t.profile).map(([k, v], i) => (
                <motion.div key={k} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card p-4">
                  <dt className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: f.colour }}>{k}</dt>
                  <dd className="text-sm leading-relaxed text-ink-2">{v}</dd>
                </motion.div>
              ))}
            </dl>
          </Section>
          {positions.length > 0 && <Section title="Doctrinal positions held" icon="branch"><EntityChips type="position" ids={positions.map((p) => p.id)} /></Section>}
          {events.length > 0 && (
            <Section title="Key events" icon="timeline">
              <ol className="relative space-y-3 border-l-2 pl-5" style={{ borderColor: f.colour }}>
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 bg-surface" style={{ borderColor: f.colour }} />
                    <span className="mr-2 text-sm font-bold tabular-nums text-muted">{formatYear(e.year, e.circa)}</span>
                    <EntityLink type="event" id={e.id} />
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
        <aside>
          <Section title="Lineage" icon="tree">
            <div className="space-y-3 text-sm">
              <div><div className="mb-1 font-bold text-muted">Parent traditions</div><EntityChips type="tradition" ids={t.parentIds} /></div>
              {split && <div><div className="mb-1 font-bold text-muted">Split event</div><EntityLink type="event" id={split.id} /> <span className="text-muted">({formatYear(split.year)})</span></div>}
              {children.length > 0 && <div><div className="mb-1 font-bold text-muted">Branches</div><EntityChips type="tradition" ids={children.map((c) => c.id)} /></div>}
            </div>
          </Section>
          <Section title="Regions" icon="globe"><div className="flex flex-wrap gap-1">{t.regions.map((r) => <span key={r} className="chip">{REGION_LABEL[r]}</span>)}</div></Section>
          {people.length > 0 && <Section title="People" icon="people"><EntityChips type="person" ids={people.map((p) => p.id)} max={40} /></Section>}
        </aside>
      </div>
      <Sources ids={t.sources} />
    </div>
  );
}
