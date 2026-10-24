import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Event, Tradition } from '../data/schema';
import { FAMILIES, REGION_LABEL, formatYear, inkTone } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, BulletList, CompareButton, CountUp, EntityChips, EntityLink, PageHeader, Section, Sources } from '../components/ui';
import NotFound from './NotFound';
import { L } from '../data/missions';
import { bigNumber } from '../data/denoms';
import { AxisChips } from './Denominations';
import { ListCard } from './MissionDetail';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';
import { Link, useNavigate } from 'react-router-dom';

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
  const dp = a.profileOf.get(t.id);

  return (
    <div>
      <PageHeader
        eyebrow={f.label}
        icon={f.icon}
        title={<span style={{ color: inkTone(f.colour) }}>{t.name}</span>}
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

      {dp && <ProfileBlock t={t} />}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Section title="Distinctives" icon="star"><BulletList items={t.distinctives} /></Section>
          <Section title="Profile" icon="layers">
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(t.profile).map(([k, v], i) => (
                <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
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

/** Core doctrines, focus, influences and the doctrine "dials" for a tradition. */
function ProfileBlock({ t }: { t: Tradition }) {
  const a = useAtlas();
  const navigate = useNavigate();
  const p = a.profileOf.get(t.id)!;
  const f = FAMILIES[t.family];
  const nodes: GNode[] = [{ id: t.id, label: t.name, sub: L('This church', 'இந்தச் சபை'), colour: f.colour }];
  const edges: GEdge[] = [];
  const add = (x: { traditionId?: string; name: string; text: string }, i: number, dir: 'in' | 'out') => {
    const id = x.traditionId ?? `${dir}${i}`;
    const tt = x.traditionId ? a.get<Tradition>('tradition', x.traditionId) : undefined;
    if (!nodes.some((n) => n.id === id)) nodes.push({ id, label: tt?.name ?? x.name, sub: dir === 'in' ? L('Influenced it', 'இதன்மீது தாக்கம்') : L('It influenced', 'இது தாக்கம் செலுத்தியது'), colour: tt ? FAMILIES[tt.family].colour : '#8a8a8a', title: x.text });
    edges.push(dir === 'in' ? { from: id, to: t.id, colour: '#2a8fb8' } : { from: t.id, to: id, colour: '#d07a1e' });
  };
  p.influencedBy.forEach((x, i) => add(x, i, 'in'));
  p.influenced.forEach((x, i) => add(x, i, 'out'));
  return (
    <div className="mb-8 space-y-4">
      <motion.div className="card flex flex-wrap items-center gap-4 p-5" style={{ borderLeft: `6px solid ${f.colour}` }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="min-w-0 flex-1 font-serif text-xl italic text-ink">“{p.tagline}”</p>
        {p.members && (
          <div className="text-right" title={p.members.note}>
            <div className="text-2xl font-bold text-accent">{bigNumber(p.members.estimate)}</div>
            <div className="text-xs text-muted">{L('members', 'உறுப்பினர்கள்')} · {p.members.year}</div>
          </div>
        )}
        <Link to={`/denominations/${t.family}`} className="chip hover:!border-accent hover:!text-accent"><Icon name="tree" size={12} /> {L('Family overview', 'குடும்பக் கண்ணோட்டம்')}</Link>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
        <ListCard title={L('Core doctrines', 'அடிப்படைக் கோட்பாடுகள்')} icon="trinity" items={p.coreDoctrines} colour={f.colour} />
        <ListCard title={L('Focus', 'கவனம்')} icon="compass" items={p.focuses} colour="#2a8fb8" />
        <div className="card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="scales" className="text-accent" /> {L('At a glance', 'ஒரே பார்வையில்')}</h3>
          <AxisChips p={p} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title={L('Practices', 'நடைமுறைகள்')} icon="lamp" items={p.practices} colour="#7a4fc2" />
        {p.keyFigures.length > 0 && (
          <div className="card p-4" style={{ borderTop: '4px solid #2e9d5b' }}>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="people" style={{ color: '#2e9d5b' }} /> {L('Key figures', 'முக்கிய நபர்கள்')}</h3>
            <ul className="space-y-2">
              {p.keyFigures.map((k, i) => (
                <li key={i} className="text-sm"><span className="font-semibold">{k.personId ? <Link to={`/people/${k.personId}`} className="text-accent underline">{k.name}</Link> : k.name}</span> — <span className="text-ink-2">{k.role}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {edges.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-bold"><Icon name="shuffle" className="text-accent" /> {L('Influences: who shaped it, whom it shaped', 'தாக்கங்கள்: இதை வடிவமைத்தவை, இது வடிவமைத்தவை')}</h3>
          <GraphFlow nodes={nodes} edges={edges} dir="LR" height={Math.max(300, Math.max(p.influencedBy.length, p.influenced.length) * 92 + 60)} onSelect={(id) => a.get('tradition', id) && id !== t.id && navigate(`/traditions/${id}`)} />
        </div>
      )}
      {p.inIndia && (
        <div className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-4">
          <span className="text-2xl">🇮🇳</span>
          <div><div className="text-xs font-bold uppercase tracking-wider text-accent">{L('In India', 'இந்தியாவில்')}</div><p className="text-ink-2">{p.inIndia}</p></div>
        </div>
      )}
      <Sources ids={p.sources} />
    </div>
  );
}
