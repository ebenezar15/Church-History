import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { PaganInfluence } from '../data/schema';
import { formatYear } from '../data/families';
import { L } from '../data/missions';
import { CATEGORIES, CATEGORY_META, EVIDENCES, EVIDENCE_META, SOURCE_META, lbl, monthName } from '../data/roots';
import { Icon } from '../components/Icon';
import { CountUp, PageHeader, Tabs, cx } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GLane, type GNode } from '../viz/GraphFlow';

type View = 'meter' | 'myths' | 'calendar' | 'flow' | 'timeline' | 'map';

export function EvidenceBadge({ e, big }: { e: PaganInfluence['evidence']; big?: boolean }) {
  const m = EVIDENCE_META[e];
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full font-bold uppercase text-white', big ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]')} style={{ background: m.colour }}>
      <Icon name={m.icon} size={big ? 14 : 11} /> {lbl(m)}
    </span>
  );
}

export default function Influences() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'meter';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const [cat, setCat] = useState('');
  const list = useMemo(() => a.influences.filter((p) => !cat || p.category === cat), [a, cat]);
  const cats = CATEGORIES.filter((c) => a.influences.some((p) => p.category === c));
  const count = (e: string) => a.influences.filter((p) => p.evidence === e).length;

  return (
    <div>
      <PageHeader eyebrow={L('Think', 'சிந்திக்க')} icon="sun" title={L('Pagan & Cultural Influences', 'பிற மத, பண்பாட்டுத் தாக்கங்கள்')}>
        {L(
          'What did Christianity take from the world around it? Festivals and the calendar, philosophy, art and buildings, worship customs, law and language. Each claim is rated honestly: some borrowings are well documented, some are debated, and some popular claims (Easter from Ishtar, Jesus copied from Mithras or Horus) are myths. Most borrowings were of forms, not of core beliefs, and many “pagan” customs actually came from Judaism.',
          'கிறிஸ்தவம் தன்னைச் சுற்றியிருந்த உலகிலிருந்து எதைப் பெற்றது? பண்டிகைகளும் நாட்காட்டியும், தத்துவம், கலையும் கட்டடங்களும், வழிபாட்டு வழக்கங்கள், சட்டம், மொழி. ஒவ்வொரு கூற்றும் நேர்மையாக மதிப்பிடப்படுகிறது: சில கடன்வாங்கல்கள் நன்கு ஆவணப்படுத்தப்பட்டவை, சில விவாதத்திற்குரியவை, சில பரவலான கூற்றுகள் (ஈஸ்டர் இஷ்தாரிலிருந்து வந்தது, இயேசு மித்ரா அல்லது ஹோரஸிடமிருந்து நகலெடுக்கப்பட்டார்) கட்டுக்கதைகள். பெரும்பாலான கடன்வாங்கல்கள் வடிவங்களைச் சார்ந்தவை, அடிப்படை நம்பிக்கைகளை அல்ல; “பிற மத” வழக்கங்கள் எனப்படும் பல உண்மையில் யூத மதத்திலிருந்து வந்தவை.',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {EVIDENCES.map((e, i) => (
          <motion.div key={e} className="card p-4" style={{ borderTop: `4px solid ${EVIDENCE_META[e].colour}` }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Icon name={EVIDENCE_META[e].icon} className="mb-1" style={{ color: EVIDENCE_META[e].colour }} />
            <div className="text-2xl font-bold text-ink"><CountUp to={count(e)} /></div>
            <div className="text-xs text-muted">{lbl(EVIDENCE_META[e])}</div>
          </motion.div>
        ))}
      </div>

      <div className="mb-4">
        <Tabs
          layoutId="influence-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'meter', label: L('Evidence meter', 'சான்று அளவி'), icon: 'scales' },
            { id: 'myths', label: L('Myth or fact?', 'கட்டுக்கதையா உண்மையா?'), icon: 'question' },
            { id: 'calendar', label: L('Festival wheel', 'பண்டிகைச் சக்கரம்'), icon: 'sun' },
            { id: 'flow', label: L('From → to', 'எதிலிருந்து → எதற்கு'), icon: 'branch' },
            { id: 'timeline', label: L('When adopted', 'எப்போது ஏற்கப்பட்டது'), icon: 'timeline' },
            { id: 'map', label: L('Map', 'வரைபடம்'), icon: 'map' },
          ]}
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !cat && '!border-accent !text-accent')} onClick={() => setCat('')}>{L('All', 'அனைத்தும்')}</button>
        {cats.map((c) => (
          <button key={c} className={cx('chip cursor-pointer', cat === c && '!border-accent !text-accent')} onClick={() => setCat(cat === c ? '' : c)}>
            <Icon name={CATEGORY_META[c].icon} size={12} style={{ color: CATEGORY_META[c].colour }} /> {lbl(CATEGORY_META[c])}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {!list.length && <p className="text-muted">{L('The influences are being added.', 'தாக்கங்கள் சேர்க்கப்படுகின்றன.')}</p>}
          {list.length > 0 && view === 'meter' && <Meter list={list} />}
          {list.length > 0 && view === 'myths' && <Myths list={list} />}
          {list.length > 0 && view === 'calendar' && <Wheel list={list} />}
          {list.length > 0 && view === 'flow' && <FromTo list={list} />}
          {list.length > 0 && view === 'timeline' && <Adoption list={list} />}
          {list.length > 0 && view === 'map' && <InfluenceMap list={list} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Four columns from "strong evidence" to "popular myth". */
function Meter({ list }: { list: PaganInfluence[] }) {
  return (
    <div>
      <div className="mb-3 h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${EVIDENCES.map((e) => EVIDENCE_META[e].colour).join(',')})` }} />
      <div className="grid gap-3 md:grid-cols-4">
        {EVIDENCES.map((e, col) => (
          <div key={e}>
            <div className="mb-2 text-center">
              <div className="font-bold" style={{ color: EVIDENCE_META[e].colour }}>{lbl(EVIDENCE_META[e])}</div>
              <div className="text-xs text-muted">{lbl(EVIDENCE_META[e].note)}</div>
            </div>
            <div className="space-y-2">
              {list.filter((p) => p.evidence === e).map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: col * 0.1 + i * 0.05, type: 'spring', stiffness: 200, damping: 18 }}>
                  <Link to={`/influences/${p.id}`} className="card block p-3 transition-shadow hover:shadow-lg" style={{ borderLeft: `4px solid ${EVIDENCE_META[e].colour}` }}>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: CATEGORY_META[p.category].colour }}><Icon name={CATEGORY_META[p.category].icon} size={11} /> {lbl(CATEGORY_META[p.category])}</div>
                    <div className="text-sm font-semibold leading-snug">{p.name}</div>
                    <div className="mt-1 text-xs text-muted">{p.sourceCulture} → {p.christianForm}</div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Flip cards: the popular claim on the front, what historians say on the back. */
function Myths({ list }: { list: PaganInfluence[] }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setFlipped((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const sorted = [...list].sort((p, q) => EVIDENCE_META[p.evidence].level - EVIDENCE_META[q.evidence].level);
  return (
    <div>
      <p className="mb-3 text-sm text-muted">{L('Read the popular claim, guess, then tap the card to see what historians say.', 'பரவலான கூற்றைப் படித்து, ஊகித்து, பின்னர் வரலாற்றாசிரியர்கள் சொல்வதைக் காண அட்டையைத் தொடுங்கள்.')}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p, i) => {
          const on = flipped.has(p.id);
          return (
            <motion.button key={p.id} type="button" onClick={() => toggle(p.id)} className="relative h-72 text-left [perspective:1000px]" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.04 }}>
              <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: on ? 180 : 0 }} transition={{ duration: 0.55 }}>
                <div className="card absolute inset-0 flex flex-col overflow-hidden p-4 [backface-visibility:hidden]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{L('Popular claim', 'பரவலான கூற்று')}</div>
                  <div className="mb-2 font-bold">{p.name}</div>
                  <p className="line-clamp-6 flex-1 font-serif text-[15px] italic text-ink-2">“{p.popularClaim}”</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-accent"><span>{L('Tap to reveal', 'வெளிப்படுத்தத் தொடுங்கள்')}</span><Icon name="shuffle" size={14} /></div>
                </div>
                <div className="card absolute inset-0 flex flex-col overflow-hidden p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ borderTop: `5px solid ${EVIDENCE_META[p.evidence].colour}` }}>
                  <div className="mb-2 flex items-center justify-between gap-2"><EvidenceBadge e={p.evidence} /><Link to={`/influences/${p.id}`} onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-accent">{L('Read more', 'மேலும் படிக்க')} →</Link></div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{L('What historians say', 'வரலாற்றாசிரியர்கள் சொல்வது')}</div>
                  <p className="line-clamp-[9] flex-1 text-sm text-ink-2">{p.whatHistoriansSay}</p>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** A year wheel: Christian feasts on the outer ring, the pagan festivals claimed or known near them on the inner ring. */
function Wheel({ list }: { list: PaganInfluence[] }) {
  const items = list.filter((p) => p.calendar);
  const [sel, setSel] = useState<string | undefined>(items[0]?.id);
  const p = items.find((x) => x.id === sel);
  const angle = (m: number, d = 15) => ((m - 1 + (d - 1) / 31) / 12) * Math.PI * 2 - Math.PI / 2;
  const pt = (ang: number, r: number) => [Math.cos(ang) * r, Math.sin(ang) * r] as const;
  if (!items.length) return <p className="text-muted">{L('No festivals in this filter.', 'இந்த வடிகட்டியில் பண்டிகைகள் இல்லை.')}</p>;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="card p-3">
        <svg viewBox="-230 -230 460 460" className="mx-auto w-full max-w-xl">
          <circle r={200} fill="none" stroke="var(--line)" strokeWidth={34} />
          <circle r={140} fill="none" stroke="var(--line)" strokeWidth={30} opacity={0.6} />
          {Array.from({ length: 12 }, (_, m) => {
            const [x1, y1] = pt(angle(m + 1, 1), 120);
            const [x2, y2] = pt(angle(m + 1, 1), 218);
            const [tx, ty] = pt(angle(m + 1, 16), 75);
            return (
              <g key={m}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--surface)" strokeWidth={2} />
                <text x={tx} y={ty} textAnchor="middle" dy="0.35em" className="fill-[var(--muted)] text-[12px] font-bold">{monthName(m + 1)}</text>
              </g>
            );
          })}
          {/* The sun's year: solstices and equinoxes */}
          {([[12, 21, '☀'], [6, 21, '☀'], [3, 20, '◐'], [9, 22, '◑']] as const).map(([m, d, s]) => {
            const [x, y] = pt(angle(m, d), 104);
            return <text key={`${m}`} x={x} y={y} textAnchor="middle" dy="0.35em" className="fill-[var(--accent)] text-[13px]">{s}</text>;
          })}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 120, ease: 'linear' }}>
            <circle r={44} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
            {Array.from({ length: 12 }, (_, i) => { const [x, y] = pt((i / 12) * Math.PI * 2, 54); return <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" opacity={0.6} />; })}
          </motion.g>
          <text textAnchor="middle" dy="0.35em" className="fill-[var(--ink)] text-[11px] font-bold">{L('Year', 'ஆண்டு')}</text>
          {items.map((x, i) => {
            const c = x.calendar!;
            const ang = angle(c.month, c.day ?? 15);
            const [ox, oy] = pt(ang, 200);
            const [ix, iy] = pt(ang, 140);
            const active = x.id === sel;
            const col = EVIDENCE_META[x.evidence].colour;
            return (
              <g key={x.id} onClick={() => setSel(x.id)} className="cursor-pointer">
                <motion.line x1={ix} y1={iy} x2={ox} y2={oy} stroke={col} strokeWidth={active ? 3 : 1.5} strokeDasharray="3 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.1 }} />
                <motion.circle cx={ix} cy={iy} r={active ? 9 : 6} fill="var(--surface)" stroke={col} strokeWidth={2.5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }} />
                <motion.circle cx={ox} cy={oy} r={active ? 12 : 8} fill={col} initial={{ scale: 0 }} animate={{ scale: active ? [1, 1.2, 1] : 1 }} transition={active ? { repeat: Infinity, duration: 1.6 } : { delay: 0.3 + i * 0.1 }} />
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-accent" /> {L('outer ring: Christian feast', 'வெளி வளையம்: கிறிஸ்தவப் பண்டிகை')}</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-accent" /> {L('inner ring: pagan festival', 'உள் வளையம்: பிற மதப் பண்டிகை')}</span>
        </div>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {p && (
            <motion.div key={p.id} className="card p-5" style={{ borderTop: `5px solid ${EVIDENCE_META[p.evidence].colour}` }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular-nums text-accent">{p.calendar!.day ?? ''} {monthName(p.calendar!.month)}</span>
                <EvidenceBadge e={p.evidence} />
              </div>
              <div className="text-lg font-bold">{p.name}</div>
              <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                <div className="rounded-xl border-2 border-dashed p-2 text-center" style={{ borderColor: SOURCE_META[p.sourceTradition].colour }}>{p.calendar!.pagan}</div>
                <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><Icon name="arrow" /></motion.span>
                <div className="rounded-xl p-2 text-center font-semibold text-white" style={{ background: 'var(--accent)' }}>{p.calendar!.christian}</div>
              </div>
              <p className="text-sm text-ink-2">{p.evidenceNote}</p>
              <Link to={`/influences/${p.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">{L('Open', 'திற')} <Icon name="arrow" size={14} /></Link>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap gap-1">
          {items.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={cx('chip cursor-pointer', x.id === sel && '!border-accent !text-accent')}>{x.calendar!.christian}</button>)}
        </div>
      </div>
    </div>
  );
}

/** Pre-Christian source → the influence (coloured by evidence) → the area of Christian life it touched. */
function FromTo({ list }: { list: PaganInfluence[] }) {
  const navigate = useNavigate();
  const g = useMemo(() => {
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    const GAP = 88;
    const items = [...list].sort((p, q) => p.sourceTradition.localeCompare(q.sourceTradition) || CATEGORIES.indexOf(p.category) - CATEGORIES.indexOf(q.category));
    const srcs = [...new Set(items.map((p) => p.sourceTradition))];
    const cats = CATEGORIES.filter((c) => items.some((p) => p.category === c));
    const H = items.length * GAP;
    srcs.forEach((s, i) => nodes.push({ id: `s:${s}`, label: lbl(SOURCE_META[s]), sub: L('Source', 'மூலம்'), colour: SOURCE_META[s].colour, x: 0, y: (i + 0.5) * (H / srcs.length) - 33 }));
    items.forEach((p, i) => {
      nodes.push({ id: p.id, label: p.name, sub: p.christianForm, colour: EVIDENCE_META[p.evidence].colour, badge: lbl(EVIDENCE_META[p.evidence]), x: 330, y: i * GAP, title: p.summary });
      edges.push({ from: `s:${p.sourceTradition}`, to: p.id, colour: SOURCE_META[p.sourceTradition].colour, dashed: p.evidence === 'myth' });
      edges.push({ from: p.id, to: `c:${p.category}`, colour: CATEGORY_META[p.category].colour, dashed: p.evidence === 'myth' });
    });
    cats.forEach((c, i) => nodes.push({ id: `c:${c}`, label: lbl(CATEGORY_META[c]), sub: L('Christian life', 'கிறிஸ்தவ வாழ்வு'), colour: CATEGORY_META[c].colour, x: 660, y: (i + 0.5) * (H / cats.length) - 33 }));
    const lanes: GLane[] = [];
    return { nodes, edges, lanes, H };
  }, [list]);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Left: the pre-Christian culture. Middle: the claimed influence, coloured by how strong the evidence is (dashed lines are myths). Right: the part of Christian life it touched. Click an influence to open it.', 'இடது: கிறிஸ்தவத்துக்கு முந்தைய பண்பாடு. நடுவில்: கூறப்படும் தாக்கம், சான்றின் வலிமைக்கேற்ப வண்ணமிடப்பட்டது (புள்ளிக்கோடுகள் கட்டுக்கதைகள்). வலது: அது தொட்ட கிறிஸ்தவ வாழ்வின் பகுதி. திறக்க ஒரு தாக்கத்தைச் சொடுக்குங்கள்.')}</p>
      <GraphFlow nodes={g.nodes} edges={g.edges} height={Math.min(820, Math.max(480, g.H * 0.55))} onSelect={(id) => !id.includes(':') && navigate(`/influences/${id}`)} />
    </div>
  );
}

/** When each influence entered Christian practice, by category. */
function Adoption({ list }: { list: PaganInfluence[] }) {
  const [hover, setHover] = useState<PaganInfluence | null>(null);
  const cats = CATEGORIES.filter((c) => list.some((p) => p.category === c));
  const Y0 = -100, Y1 = 1700;
  const x = (y: number) => ((Math.max(Y0, Math.min(Y1, y)) - Y0) / (Y1 - Y0)) * 100;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-4">
        <div className="min-w-[640px]">
          <div className="relative mb-2 ml-[150px] h-5 text-[10px] text-muted">
            {[0, 300, 600, 900, 1200, 1500].map((y) => <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${x(y)}%` }}>{formatYear(y)}</span>)}
          </div>
          {cats.map((c) => {
            const items = list.filter((p) => p.category === c);
            return (
              <div key={c} className="flex items-stretch border-t border-line">
                <div className="flex w-[150px] shrink-0 items-center gap-1 py-3 pr-2 text-xs font-bold" style={{ color: CATEGORY_META[c].colour }}><Icon name={CATEGORY_META[c].icon} size={12} /> {lbl(CATEGORY_META[c])}</div>
                <div className="relative flex-1" style={{ minHeight: 26 + items.length * 9 }}>
                  {items.map((p, i) => (
                    <Link key={p.id} to={`/influences/${p.id}`} onMouseEnter={() => setHover(p)} className="absolute" style={{ left: `${x(p.startYear)}%`, width: p.endYear ? `${Math.max(0.8, x(p.endYear) - x(p.startYear))}%` : undefined, top: 8 + i * 9 }}>
                      <motion.span
                        className="block h-2 rounded-full"
                        style={{ background: EVIDENCE_META[p.evidence].colour, minWidth: 8, transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05, duration: 0.5 }}
                        whileHover={{ scaleY: 2 }}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card h-fit p-4">
        {hover ? (
          <>
            <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-bold tabular-nums text-accent">{formatYear(hover.startYear)}{hover.endYear ? ` – ${formatYear(hover.endYear)}` : ''}</span><EvidenceBadge e={hover.evidence} /></div>
            <div className="font-bold">{hover.name}</div>
            <p className="mt-1 text-sm text-ink-2">{hover.summary}</p>
          </>
        ) : <p className="text-sm text-muted">{L('Point at a bar to see the influence; bars run from when it began to when it settled.', 'தாக்கத்தைக் காண ஒரு பட்டையைச் சுட்டுங்கள்; பட்டைகள் அது தொடங்கிய காலம் முதல் நிலைபெற்ற காலம் வரை செல்கின்றன.')}</p>}
      </div>
    </div>
  );
}

function InfluenceMap({ list }: { list: PaganInfluence[] }) {
  const [sel, setSel] = useState<string | undefined>();
  const p = list.find((x) => x.id === sel);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <MissionMap
        focus={{ lng: [-12, 50], lat: [24, 60] }}
        points={list.map((x) => ({ id: x.id, name: x.place.name, lng: x.place.lng, lat: x.place.lat, colour: EVIDENCE_META[x.evidence].colour, year: x.startYear, size: x.id === sel ? 7 : 5, label: x.id === sel }))}
        selected={sel}
        onSelect={(_, id) => setSel(id === sel ? undefined : id)}
      />
      <div className="card h-fit p-4">
        {p ? (
          <>
            <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs text-muted">{p.place.name}</span><EvidenceBadge e={p.evidence} /></div>
            <div className="text-lg font-bold">{p.name}</div>
            <p className="mt-2 text-sm text-ink-2">{p.summary}</p>
            <Link to={`/influences/${p.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">{L('Open', 'திற')} <Icon name="arrow" size={14} /></Link>
          </>
        ) : <p className="text-sm text-muted">{L('Click a dot to see where each influence is best attested. Colours show the strength of the evidence.', 'ஒவ்வொரு தாக்கமும் சிறப்பாகச் சான்றளிக்கப்படும் இடத்தைக் காண ஒரு புள்ளியைச் சொடுக்குங்கள். வண்ணங்கள் சான்றின் வலிமையைக் காட்டுகின்றன.')}</p>}
      </div>
    </div>
  );
}
