import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Tradition, TraditionFamily } from '../data/schema';
import { FAMILIES, formatYear } from '../data/families';
import { L } from '../data/missions';
import { bigNumber } from '../data/denoms';
import { Icon } from '../components/Icon';
import { Sources, Tabs } from '../components/ui';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';
import { MissionMap } from '../viz/MissionMap';
import { ListCard } from './MissionDetail';
import { famLabel, membersOf } from './Denominations';
import NotFound from './NotFound';

type Tab = 'story' | 'tree' | 'beliefs' | 'splits' | 'churches';

export default function FamilyDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('tree');
  const fam = id as TraditionFamily;
  const meta = FAMILIES[fam];
  const fp = a.familyOf.get(fam);
  const ts = useMemo(() => a.traditions.filter((t) => t.family === fam).sort((p, q) => p.foundedYear - q.foundedYear), [a, fam]);
  const tree = useMemo(() => {
    const ids = new Set(ts.map((t) => t.id));
    const nodes: GNode[] = ts.map((t) => ({ id: t.id, label: t.name, sub: formatYear(t.foundedYear), colour: meta?.colour ?? '#888', title: a.profileOf.get(t.id)?.tagline ?? t.summary }));
    const edges: GEdge[] = [];
    for (const t of ts) for (const p of t.parentIds) {
      if (ids.has(p)) edges.push({ from: p, to: t.id, colour: meta?.colour });
      else { const pt = a.get<Tradition>('tradition', p); if (pt) { if (!nodes.some((n) => n.id === p)) nodes.push({ id: p, label: pt.name, sub: famLabel(pt.family), colour: FAMILIES[pt.family].colour }); edges.push({ from: p, to: t.id, colour: FAMILIES[pt.family].colour, dashed: true }); } }
    }
    return { nodes, edges };
  }, [ts, a, meta]);
  if (!meta) return <NotFound />;
  const fams = Object.keys(FAMILIES) as TraditionFamily[];
  const idx = fams.indexOf(fam);

  return (
    <article>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/denominations?view=families" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Denominations & Divisions', 'சபைப் பிரிவுகளும் பிளவுகளும்')}</Link>
        <div className="flex flex-wrap items-center gap-3">
          <motion.span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: meta.colour }} initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring' }}><Icon name={meta.icon} size={28} /></motion.span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: meta.colour }}>{fp?.name ?? famLabel(fam)}</h1>
            {fp && <p className="text-lg italic text-ink-2">{fp.tagline}</p>}
          </div>
        </div>
        {fp && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{fp.summary}</p>}
      </motion.header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4"><div className="text-xs uppercase tracking-wider text-muted">{L('Began', 'தொடக்கம்')}</div><div className="text-xl font-bold">{fp ? formatYear(fp.origin.year) : formatYear(ts[0]?.foundedYear ?? 0)}</div>{fp && <div className="text-xs text-muted">{fp.origin.place.name}</div>}</div>
        <div className="card p-4"><div className="text-xs uppercase tracking-wider text-muted">{L('Members', 'உறுப்பினர்கள்')}</div><div className="text-xl font-bold">{fp?.members ? bigNumber(fp.members.estimate) : '—'}</div>{fp?.members && <div className="text-xs text-muted">{fp.members.source}, {fp.members.year}</div>}</div>
        <div className="card p-4"><div className="text-xs uppercase tracking-wider text-muted">{L('Churches in the atlas', 'அட்லஸிலுள்ள சபைகள்')}</div><div className="text-xl font-bold">{ts.length}</div></div>
        <div className="card p-4"><div className="text-xs uppercase tracking-wider text-muted">{L('Internal divisions', 'உள் பிளவுகள்')}</div><div className="text-xl font-bold">{fp?.internalDivisions.length ?? 0}</div></div>
      </div>

      {fp && (
        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="card p-4" style={{ borderTop: `4px solid ${meta.colour}` }}>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{L('How it began', 'எவ்வாறு தொடங்கியது')}</div>
            <p className="text-ink-2">{fp.origin.event}</p>
          </div>
          <MissionMap focus={{ lng: [fp.origin.place.lng - 30, fp.origin.place.lng + 30], lat: [fp.origin.place.lat - 18, fp.origin.place.lat + 18] }} points={[{ id: 'o', name: fp.origin.place.name, lng: fp.origin.place.lng, lat: fp.origin.place.lat, colour: meta.colour, size: 7, label: true }]} />
        </div>
      )}

      <div className="mb-5">
        <Tabs
          layoutId="family-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'tree', label: L('Family tree', 'குடும்ப மரம்'), icon: 'tree' },
            { id: 'beliefs', label: L('Beliefs & focus', 'நம்பிக்கைகளும் கவனமும்'), icon: 'trinity' },
            { id: 'splits', label: L('How it divided', 'எவ்வாறு பிளவுபட்டது'), icon: 'split' },
            { id: 'story', label: L('Story', 'வரலாறு'), icon: 'book' },
            { id: 'churches', label: L('Churches', 'சபைகள்'), icon: 'people' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'tree' && (
            <div>
              <p className="mb-2 text-sm text-muted">{L('Arrows run from parent to branch; dashed boxes are parents from other families. Click a church to open it.', 'அம்புகள் தாய்ச் சபையிலிருந்து கிளையை நோக்கிச் செல்கின்றன; புள்ளிக்கோட்டுப் பெட்டிகள் பிற குடும்பங்களிலிருந்து வந்த தாய்ச் சபைகள். திறக்க ஒரு சபையைச் சொடுக்குங்கள்.')}</p>
              <GraphFlow nodes={tree.nodes} edges={tree.edges} dir="TB" height={Math.min(760, 260 + ts.length * 28)} onSelect={(x) => navigate(`/traditions/${x}`)} />
            </div>
          )}
          {tab === 'beliefs' && fp && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('Core doctrines', 'அடிப்படைக் கோட்பாடுகள்')} icon="trinity" items={fp.coreDoctrines} colour={meta.colour} />
              <ListCard title={L('Focus', 'கவனம்')} icon="compass" items={fp.focuses} colour="#2a8fb8" />
              <ListCard title={L('Strengths', 'பலங்கள்')} icon="star" items={fp.strengths} colour="#2e9d5b" />
              <ListCard title={L('Criticisms', 'விமர்சனங்கள்')} icon="scales" items={fp.criticisms} colour="#c0392b" />
              {fp.influencedFamilies.length > 0 && (
                <div className="card p-4 md:col-span-2">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="shuffle" className="text-accent" /> {L('Its influence on other families', 'பிற குடும்பங்களின் மீது அதன் தாக்கம்')}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {fp.influencedFamilies.map((x, i) => (
                      <motion.div key={i} className="flex gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <Icon name="arrow" className="mt-1 shrink-0" style={{ color: FAMILIES[x.family].colour }} />
                        <p className="text-sm"><Link to={`/denominations/${x.family}`} className="font-bold hover:text-accent" style={{ color: FAMILIES[x.family].colour }}>{famLabel(x.family)}</Link>: {x.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'splits' && fp && (
            <ol className="relative ml-2 max-w-3xl border-l-2 pl-6" style={{ borderColor: meta.colour }}>
              {[...fp.internalDivisions].sort((p, q) => (p.year ?? 0) - (q.year ?? 0)).map((d, i) => (
                <motion.li key={i} className="relative mb-5" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <span className="absolute -left-[35px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: meta.colour }}><Icon name="split" size={11} /></span>
                  <div className="text-sm font-bold tabular-nums" style={{ color: meta.colour }}>{d.year ? formatYear(d.year) : ''}</div>
                  <div className="font-bold">{d.name}</div>
                  <p className="text-ink-2">{d.text}</p>
                </motion.li>
              ))}
            </ol>
          )}
          {tab === 'story' && fp && (
            <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-ink-2">
              {fp.story.split(/\n\s*\n/).map((p, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{p}</motion.p>
              ))}
            </div>
          )}
          {(tab === 'beliefs' || tab === 'splits' || tab === 'story') && !fp && <p className="text-muted">{L('This family overview is being added.', 'இந்தக் குடும்பக் கண்ணோட்டம் சேர்க்கப்படுகிறது.')}</p>}
          {tab === 'churches' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ts.map((t, i) => {
                const p = a.profileOf.get(t.id);
                const n = membersOf(a, t);
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.03 }}>
                    <Link to={`/traditions/${t.id}`} className="card block h-full p-3 transition-shadow hover:shadow-lg" style={{ borderLeft: `4px solid ${meta.colour}` }}>
                      <div className="flex items-baseline justify-between gap-2"><span className="font-bold">{t.name}</span><span className="shrink-0 text-xs tabular-nums text-muted">{formatYear(t.foundedYear)}</span></div>
                      {p && <p className="text-sm italic text-ink-2">{p.tagline}</p>}
                      {n ? <div className="mt-1 text-xs text-muted">{bigNumber(n)} {L('members', 'உறுப்பினர்கள்')}</div> : null}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {fp && <div className="mt-10"><Sources ids={fp.sources} /></div>}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {idx > 0 ? <button onClick={() => navigate(`/denominations/${fams[idx - 1]}`)} className="card p-3 text-left hover:text-accent">← {famLabel(fams[idx - 1])}</button> : <span />}
        {idx < fams.length - 1 && <button onClick={() => navigate(`/denominations/${fams[idx + 1]}`)} className="card p-3 text-right hover:text-accent">{famLabel(fams[idx + 1])} →</button>}
      </nav>
    </article>
  );
}
