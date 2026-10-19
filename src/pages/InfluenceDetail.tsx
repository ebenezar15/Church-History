import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { ChurchFather, PaganInfluence } from '../data/schema';
import { formatYear } from '../data/families';
import { L } from '../data/missions';
import { CATEGORY_META, EVIDENCES, EVIDENCE_META, SOURCE_META, lbl, monthName } from '../data/roots';
import { Icon } from '../components/Icon';
import { BookmarkButton, ConfidenceBadge, Sources, Tabs, TraditionChip } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { ListCard } from './MissionDetail';
import { EvidenceBadge } from './Influences';
import NotFound from './NotFound';

type Tab = 'story' | 'how' | 'voices' | 'today' | 'map';

export default function InfluenceDetail() {
  const { id } = useParams();
  const a = useAtlas();
  const navigate = useNavigate();
  const p = a.get<PaganInfluence>('influence', id!);
  const [tab, setTab] = useState<Tab>('story');
  const [reveal, setReveal] = useState(false);
  if (!p) return <NotFound />;
  const ev = EVIDENCE_META[p.evidence];
  const cat = CATEGORY_META[p.category];
  const src = SOURCE_META[p.sourceTradition];
  const idx = a.influences.findIndex((x) => x.id === p.id);
  const prev = a.influences[idx - 1];
  const next = a.influences[idx + 1];
  const voice = (v: PaganInfluence['defenders'][number]) =>
    v.fatherId ? <Link to={`/fathers/${v.fatherId}`} className="hover:text-accent">{v.name}</Link> : v.personId ? <Link to={`/people/${v.personId}`} className="hover:text-accent">{v.name}</Link> : v.name;

  return (
    <article>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/influences" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><Icon name="arrow-left" size={14} /> {L('Pagan & Cultural Influences', 'பிற மத, பண்பாட்டுத் தாக்கங்கள்')}</Link>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: cat.colour }}>
          <Icon name={cat.icon} size={14} /> {lbl(cat)} · <span className="tabular-nums">{formatYear(p.startYear)}{p.endYear ? ` – ${formatYear(p.endYear)}` : ''}</span> · {p.place.name}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <BookmarkButton type="influence" id={p.id} label={p.name} />
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{p.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <EvidenceBadge e={p.evidence} big />
          <ConfidenceBadge value={p.confidence} />
          {p.traditionIds.map((t) => <TraditionChip key={t} id={t} />)}
        </div>
      </motion.header>

      {/* From → to: the pre-Christian form becomes the Christian one */}
      <div className="mb-6 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <motion.div className="card p-4" style={{ borderTop: `5px solid ${src.colour}` }} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }}>
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: src.colour }}>{lbl(src)}</div>
          <div className="text-lg font-bold">{p.sourceCulture}</div>
        </motion.div>
        <motion.div className="flex flex-col items-center text-accent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 }}>
          <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="hidden sm:block"><Icon name="arrow" size={28} /></motion.span>
          <span className="text-2xl sm:hidden">↓</span>
          <span className="text-[10px] font-bold uppercase" style={{ color: ev.colour }}>{lbl(ev)}</span>
        </motion.div>
        <motion.div className="card p-4" style={{ borderTop: '5px solid var(--accent)' }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 140, damping: 16 }}>
          <div className="text-xs font-bold uppercase tracking-wider text-accent">{L('Christian form', 'கிறிஸ்தவ வடிவம்')}</div>
          <div className="text-lg font-bold">{p.christianForm}</div>
        </motion.div>
      </div>

      {/* Claim vs evidence */}
      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="card p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{L('How strong is the evidence?', 'சான்று எவ்வளவு வலுவானது?')}</div>
          <div className="flex items-end gap-2">
            {[...EVIDENCES].reverse().map((e, i) => (
              <div key={e} className="flex flex-1 flex-col items-center gap-1">
                <motion.div className="w-full rounded-t-lg" style={{ background: EVIDENCE_META[e].colour, opacity: e === p.evidence ? 1 : 0.2 }} initial={{ height: 0 }} animate={{ height: 18 + EVIDENCE_META[e].level * 22 }} transition={{ delay: 0.1 + i * 0.1, type: 'spring' }} />
                <span className="text-center text-[10px] font-semibold leading-tight" style={{ color: e === p.evidence ? EVIDENCE_META[e].colour : 'var(--muted)' }}>{lbl(EVIDENCE_META[e])}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-2">{p.evidenceNote}</p>
        </div>
        <div className="card relative overflow-hidden p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">{L('The popular claim', 'பரவலான கூற்று')}</div>
          <p className="mb-3 font-serif text-lg italic text-ink">“{p.popularClaim}”</p>
          <AnimatePresence mode="wait">
            {reveal ? (
              <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-l-4 bg-surface-2 p-3" style={{ borderColor: ev.colour }}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: ev.colour }}>{L('What historians say', 'வரலாற்றாசிரியர்கள் சொல்வது')}</div>
                <p className="text-ink-2">{p.whatHistoriansSay}</p>
              </motion.div>
            ) : (
              <motion.button key="b" onClick={() => setReveal(true)} className="chip cursor-pointer !border-accent !text-accent" whileHover={{ scale: 1.05 }}>
                <Icon name="search" size={14} /> {L('What do historians say?', 'வரலாற்றாசிரியர்கள் என்ன சொல்கிறார்கள்?')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {p.calendar && (
        <motion.div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-accent text-white">
            <span className="text-xs font-bold uppercase">{monthName(p.calendar.month)}</span>
            <span className="text-2xl font-bold leading-none">{p.calendar.day ?? '—'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{p.calendar.christian}</div>
            <div className="text-sm text-muted">{L('Near or linked to', 'அருகில் அல்லது தொடர்புடையது')}: {p.calendar.pagan}</div>
          </div>
        </motion.div>
      )}

      <div className="mb-5">
        <Tabs
          layoutId="influence-tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'story', label: L('Story', 'வரலாறு'), icon: 'book' },
            { id: 'how', label: L('How it happened', 'எப்படி நடந்தது'), icon: 'branch' },
            { id: 'voices', label: L('For and against', 'ஆதரவும் எதிர்ப்பும்'), icon: 'scales' },
            { id: 'today', label: L('Kept or rejected', 'ஏற்றவை, மறுத்தவை'), icon: 'split' },
            { id: 'map', label: L('Map', 'வரைபடம்'), icon: 'map' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'story' && (
            <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-ink-2">
              {p.story.split(/\n\s*\n/).map((x, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:text-accent' : ''}>{x}</motion.p>
              ))}
              {p.examples.length > 0 && <ListCard title={L('Examples', 'எடுத்துக்காட்டுகள்')} icon="star" items={p.examples} colour={cat.colour} />}
            </div>
          )}
          {tab === 'how' && (
            <div className="max-w-3xl">
              {p.howItHappened.map((x, i) => (
                <motion.div key={i} className="flex gap-3" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: cat.colour }}>{i + 1}</span>
                    {i < p.howItHappened.length - 1 && <motion.span className="w-0.5 flex-1" style={{ background: cat.colour }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.1 + 0.1 }} />}
                  </div>
                  <p className="pb-5 text-ink-2">{x}</p>
                </motion.div>
              ))}
            </div>
          )}
          {tab === 'voices' && (
            <div className="grid gap-4 md:grid-cols-2">
              {([[p.defenders, L('Welcomed or defended it', 'வரவேற்றவர்கள் அல்லது ஆதரித்தவர்கள்'), '#2e9d5b', 'check'], [p.critics, L('Criticised or rejected it', 'விமர்சித்தவர்கள் அல்லது மறுத்தவர்கள்'), '#c0392b', 'close']] as const).map(([vs, title, c, icon], k) => (
                <div key={k}>
                  <h3 className="mb-2 flex items-center gap-2 font-bold" style={{ color: c }}><Icon name={icon} /> {title}</h3>
                  <div className="space-y-2">
                    {vs.map((v, i) => (
                      <motion.div key={i} className="card p-3" style={{ borderLeft: `4px solid ${c}` }} initial={{ opacity: 0, x: k ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <div className="font-bold">{voice(v)}</div>
                        <p className="text-sm text-ink-2">{v.text}</p>
                      </motion.div>
                    ))}
                    {!vs.length && <p className="text-muted">—</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'today' && (
            <div className="grid gap-4 md:grid-cols-2">
              <ListCard title={L('Kept by', 'ஏற்றுக்கொண்டவர்கள்')} icon="check" items={p.keptBy} colour="#2e9d5b" />
              <ListCard title={L('Rejected by', 'மறுத்தவர்கள்')} icon="close" items={p.rejectedBy} colour="#c0392b" />
              {p.fatherIds.length > 0 && (
                <div className="card p-4 md:col-span-2">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{L('Church Fathers involved', 'தொடர்புடைய திருச்சபைத் தந்தையர்')}</div>
                  <div className="flex flex-wrap gap-2">{p.fatherIds.map((f) => <Link key={f} to={`/fathers/${f}`} className="chip hover:!border-accent hover:!text-accent"><Icon name="quill" size={12} /> {a.get<ChurchFather>('father', f)?.name ?? f}</Link>)}</div>
                </div>
              )}
              {p.relatedIds.length > 0 && (
                <div className="card p-4 md:col-span-2">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{L('Related influences', 'தொடர்புடைய தாக்கங்கள்')}</div>
                  <div className="flex flex-wrap gap-2">{p.relatedIds.map((r) => { const x = a.get<PaganInfluence>('influence', r); return x ? <Link key={r} to={`/influences/${r}`} className="chip hover:!border-accent hover:!text-accent"><span className="h-2 w-2 rounded-full" style={{ background: EVIDENCE_META[x.evidence].colour }} /> {x.name}</Link> : null; })}</div>
                </div>
              )}
            </div>
          )}
          {tab === 'map' && (
            <MissionMap
              focus={{ lng: [p.place.lng - 25, p.place.lng + 25], lat: [p.place.lat - 15, p.place.lat + 15] }}
              points={[{ id: p.id, name: p.place.name, lng: p.place.lng, lat: p.place.lat, colour: ev.colour, size: 7, label: true }]}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10"><Sources ids={p.sources} /></div>
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? <button onClick={() => navigate(`/influences/${prev.id}`)} className="card p-3 text-left hover:text-accent">← {prev.name}</button> : <span />}
        {next && <button onClick={() => navigate(`/influences/${next.id}`)} className="card p-3 text-right hover:text-accent">{next.name} →</button>}
      </nav>
    </article>
  );
}
