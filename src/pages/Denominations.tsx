import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { hierarchy, select, treemap, treemapSquarify, zoom, zoomIdentity, type ZoomTransform } from 'd3';
import { useAtlas, type Atlas } from '../data/db';
import type { DenomFact, DenomProfile, Tradition, TraditionFamily } from '../data/schema';
import { FAMILIES } from '../data/families';
import { L } from '../data/missions';
import { AXES, FAMILY_TA, LITURGY_LABELS, SACRAMENT_LABELS, VERDICT_META, bigNumber, tl } from '../data/denoms';
import { isTA } from '../i18n/lang';
import { Icon } from '../components/Icon';
import { CountUp, PageHeader, Tabs, cx } from '../components/ui';
import { GraphFlow, type GEdge, type GNode } from '../viz/GraphFlow';

type View = 'count' | 'mindmap' | 'size' | 'doctrine' | 'finder' | 'influence' | 'families';
export const famLabel = (f: TraditionFamily) => (isTA() ? FAMILY_TA[f] : FAMILIES[f].label);
const FAMILY_ORDER = Object.keys(FAMILIES) as TraditionFamily[];
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** Members of a tradition: the profile's estimate, else the tradition's adherents. */
export const membersOf = (a: Atlas, t: Tradition) => a.profileOf.get(t.id)?.members?.estimate ?? t.adherents?.estimate;

export default function Denominations() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'count';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const families = FAMILY_ORDER.filter((f) => a.traditions.some((t) => t.family === f));
  const profiled = a.denomProfiles.length;

  return (
    <div>
      <PageHeader eyebrow={L('Think', 'சிந்திக்க')} icon="split" title={L('Denominations & Divisions', 'சபைப் பிரிவுகளும் பிளவுகளும்')}>
        {L(
          'Christianity is one faith in many households. Here are its great families and their branches, from the ancient churches to the newest independent movements: what each believes, what it focuses on, who shaped it and whom it shaped. And the famous number: are there really more than 30,000 denominations?',
          'கிறிஸ்தவம் பல குடும்பங்களைக் கொண்ட ஒரே விசுவாசம். பண்டைய சபைகள் முதல் புதிய சுயாதீன இயக்கங்கள் வரை அதன் பெரும் குடும்பங்களும் கிளைகளும் இங்கே உள்ளன: ஒவ்வொன்றும் எதை நம்புகிறது, எதில் கவனம் செலுத்துகிறது, அதை வடிவமைத்தவர் யார், அது யாரை வடிவமைத்தது. அந்தப் புகழ்பெற்ற எண்ணும்: உண்மையிலேயே 30,000-க்கும் மேற்பட்ட சபைப் பிரிவுகள் உள்ளனவா?',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [families.length, L('families', 'குடும்பங்கள்'), 'tree'],
          [a.traditions.length, L('churches & movements', 'சபைகளும் இயக்கங்களும்'), 'split'],
          [profiled, L('with doctrine profiles', 'கோட்பாட்டு விவரத்துடன்'), 'layers'],
          [a.denomFacts.length, L('facts checked', 'சரிபார்க்கப்பட்ட உண்மைகள்'), 'check'],
        ] as const).map(([n, label, icon], i) => (
          <motion.div key={i} className="card p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Icon name={icon} className="mb-1 text-accent" />
            <div className="text-2xl font-bold text-ink"><CountUp to={n} /></div>
            <div className="text-xs text-muted">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="mb-5">
        <Tabs
          layoutId="denom-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'count', label: L('30,000 denominations?', '30,000 சபைப் பிரிவுகளா?'), icon: 'question' },
            { id: 'mindmap', label: L('Mind map', 'மன வரைபடம்'), icon: 'sun' },
            { id: 'size', label: L('How big?', 'எவ்வளவு பெரியது?'), icon: 'layers' },
            { id: 'doctrine', label: L('Doctrine map', 'கோட்பாட்டு வரைபடம்'), icon: 'compass' },
            { id: 'finder', label: L('Belief finder', 'நம்பிக்கை வழிகாட்டி'), icon: 'branch' },
            { id: 'influence', label: L('Who shaped whom', 'யார் யாரை வடிவமைத்தனர்'), icon: 'shuffle' },
            { id: 'families', label: L('Families', 'குடும்பங்கள்'), icon: 'tree' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {view === 'count' && <CountView facts={a.denomFacts} />}
          {view === 'mindmap' && <MindMap />}
          {view === 'size' && <SizeView />}
          {view === 'doctrine' && <DoctrineMap />}
          {view === 'finder' && <Finder />}
          {view === 'influence' && <InfluenceWeb />}
          {view === 'families' && <FamilyCards />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ the count */

function Verdict({ v, big }: { v: DenomFact['verdict']; big?: boolean }) {
  const m = VERDICT_META[v];
  return (
    <motion.span
      className={cx('inline-flex shrink-0 rotate-[-4deg] items-center rounded-md border-2 font-black uppercase tracking-wider', big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[10px]')}
      style={{ borderColor: m.colour, color: m.colour }}
      initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
    >
      {tl(m)}
    </motion.span>
  );
}

function CountView({ facts }: { facts: DenomFact[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!facts.length) return <p className="text-muted">{L('The facts are being added.', 'உண்மைகள் சேர்க்கப்படுகின்றன.')}</p>;
  const hero = facts[0];
  // The growth chart takes the largest count for each year; the rest of that year's figures are its breakdown.
  const byYear = new Map<number, DenomFact['figures'][number]>();
  for (const f of hero.figures) if (f.year && f.value > (byYear.get(f.year)?.value ?? -1)) byYear.set(f.year, f);
  const dated = [...byYear.values()].sort((p, q) => (p.year ?? 0) - (q.year ?? 0));
  const latest = dated.filter((f) => (f.year ?? 0) <= new Date().getFullYear()).at(-1) ?? hero.figures[0];
  const other = hero.figures.filter((f) => !dated.includes(f));
  const max = Math.max(...hero.figures.map((f) => f.value), 1);
  return (
    <div>
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="card relative overflow-hidden p-6">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-accent">{L('The claim', 'கூற்று')}</div>
            <Verdict v={hero.verdict} big />
          </div>
          <p className="mb-4 font-serif text-xl italic text-ink">“{hero.claim}”</p>
          {latest && (
            <div className="mb-3">
              <div className="text-5xl font-black tabular-nums text-accent"><CountUp to={latest.value} duration={2} /></div>
              <div className="text-sm text-muted">{latest.label}{latest.year ? ` (${latest.year})` : ''}</div>
            </div>
          )}
          <p className="text-ink-2">{hero.answer}</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">{L('How the number grew', 'எண் எவ்வாறு வளர்ந்தது')}</div>
          <div className="flex h-48 items-end gap-2">
            {dated.map((f, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={f.note}>
                <span className="text-[10px] font-bold tabular-nums text-ink">{f.value.toLocaleString('en-IN')}</span>
                <motion.div className="w-full rounded-t-lg bg-accent" initial={{ height: 0 }} animate={{ height: `${(f.value / max) * 150}px` }} transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 80 }} />
                <span className="text-[10px] tabular-nums text-muted">{f.year}</span>
              </div>
            ))}
          </div>
          <CountingDiagram />
        </div>
      </div>

      {other.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">{L('Where the numbers come from', 'எண்கள் எங்கிருந்து வருகின்றன')}</div>
          <div className="space-y-2">
            {other.map((f, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,180px)_1fr] items-center gap-3 text-sm">
                <span className="truncate font-semibold" title={f.label}>{f.label}</span>
                <div className="flex items-center gap-2">
                  <motion.span className="block h-4 rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, Math.sqrt(f.value / max) * 100)}%` }} transition={{ delay: i * 0.08 }} />
                  <span className="shrink-0 text-xs font-bold tabular-nums">{f.value.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{L('Bar lengths use a square-root scale so small numbers stay visible.', 'சிறிய எண்களும் தெரியும்படி பட்டைகளின் நீளம் வர்க்கமூல அளவில் உள்ளது.')}</p>
        </div>
      )}

      <h2 className="mb-3 text-xl font-bold">{L('Fact checks', 'உண்மைச் சரிபார்ப்புகள்')}</h2>
      <div className="space-y-3">
        {facts.map((f, i) => {
          const on = open === f.id || (open === null && i === 0);
          return (
            <motion.div key={f.id} className="card overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ borderLeft: `5px solid ${VERDICT_META[f.verdict].colour}` }}>
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(on ? '' : f.id)}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-accent">{i + 1}</span>
                <span className="min-w-0 flex-1 font-semibold">{f.question}</span>
                <Verdict v={f.verdict} />
                <motion.span animate={{ rotate: on ? 90 : 0 }}><Icon name="arrow" size={16} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="space-y-3 px-4 pb-4 text-ink-2">
                      <p className="font-semibold text-ink">{f.answer}</p>
                      {f.explanation.split(/\n\s*\n/).map((p, j) => <p key={j}>{p}</p>)}
                      {f.figures.length > 0 && i > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {f.figures.map((g, j) => (
                            <div key={j} className="rounded-xl bg-surface-2 p-3" title={g.note}>
                              <div className="text-lg font-bold tabular-nums text-accent">{bigNumber(g.value)}</div>
                              <div className="text-xs font-semibold">{g.label}{g.year ? ` · ${g.year}` : ''}</div>
                              <div className="text-[11px] text-muted">{g.note}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** One church in eight countries is counted as eight "denominations". */
function CountingDiagram() {
  const pts = Array.from({ length: 8 }, (_, i) => { const ang = (i / 8) * Math.PI * 2 - Math.PI / 2; return [Math.cos(ang) * 92, Math.sin(ang) * 62] as const; });
  return (
    <div className="mt-4 grid items-center gap-3 sm:grid-cols-[200px_1fr]">
      <svg viewBox="-120 -85 240 170" className="w-full">
        {pts.map(([x, y], i) => (
          <g key={i}>
            <motion.line x1={0} y1={0} x2={x} y2={y} stroke="var(--accent)" strokeDasharray="3 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 + i * 0.1 }} />
            <motion.circle cx={x} cy={y} r={11} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + i * 0.1 }} />
            <motion.text x={x} y={y} textAnchor="middle" dy="0.35em" className="fill-[var(--accent)] text-[10px] font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.1 }}>{i + 1}</motion.text>
          </g>
        ))}
        <circle r={20} fill="var(--accent)" />
        <text textAnchor="middle" dy="0.35em" className="fill-white text-[16px]">⛪</text>
      </svg>
      <p className="text-sm text-ink-2">{L('The big counts treat each church organisation in each country as a separate “denomination”. One worldwide church in eight countries counts as eight, so the number measures organisations, not eight different sets of beliefs.', 'பெரிய எண்ணிக்கைகள் ஒவ்வொரு நாட்டிலுமுள்ள ஒவ்வொரு சபை அமைப்பையும் தனி “சபைப் பிரிவாக” எண்ணுகின்றன. எட்டு நாடுகளிலுள்ள ஒரே உலகளாவிய சபை எட்டாக எண்ணப்படுகிறது; எனவே இந்த எண் அமைப்புகளை அளக்கிறது, எட்டு வெவ்வேறு நம்பிக்கைத் தொகுப்புகளை அல்ல.')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ mind map */

function MindMap() {
  const a = useAtlas();
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  useEffect(() => {
    if (!svgRef.current) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([0.7, 5]).on('zoom', (e) => setT(e.transform));
    select(svgRef.current).call(z).on('dblclick.zoom', null);
    return () => { select(svgRef.current!).on('.zoom', null); };
  }, []);
  const layout = useMemo(() => {
    const fams = FAMILY_ORDER.filter((f) => a.traditions.some((x) => x.family === f));
    const total = a.traditions.length + fams.length;
    let acc = 0;
    const R1 = 170, R2 = 360;
    const famNodes = fams.map((f) => {
      const ts = a.traditions.filter((x) => x.family === f).sort((p, q) => p.foundedYear - q.foundedYear);
      const start = acc; acc += ts.length + 1;
      const mid = ((start + (ts.length + 1) / 2) / total) * Math.PI * 2 - Math.PI / 2;
      const kids = ts.map((x, i) => {
        const ang = ((start + 0.5 + i + 0.5) / total) * Math.PI * 2 - Math.PI / 2;
        return { t: x, ang, x: Math.cos(ang) * R2, y: Math.sin(ang) * R2 };
      });
      return { f, ang: mid, x: Math.cos(mid) * R1, y: Math.sin(mid) * R1, kids };
    });
    return famNodes;
  }, [a.traditions]);

  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('From the one apostolic church at the centre, the families and then their branches. Point at a family to light it up; scroll to zoom, drag to move; click a name to open it.', 'நடுவிலுள்ள ஒரே அப்போஸ்தலிக்கத் திருச்சபையிலிருந்து குடும்பங்களும் பின்னர் அவற்றின் கிளைகளும். ஒரு குடும்பத்தை ஒளிரச் செய்ய அதைச் சுட்டுங்கள்; பெரிதாக்க உருட்டுங்கள், நகர்த்த இழுங்கள்; திறக்க ஒரு பெயரைச் சொடுக்குங்கள்.')}</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
        <svg ref={svgRef} viewBox="-600 -560 1200 1120" className="h-[78vh] max-h-[900px] w-full cursor-grab touch-none active:cursor-grabbing">
          <g transform={t.toString()}>
            {layout.map((fn, i) => {
              const c = FAMILIES[fn.f].colour;
              const dim = hover && hover !== fn.f ? 0.15 : 1;
              return (
                <g key={fn.f} opacity={dim} onMouseEnter={() => setHover(fn.f)} onMouseLeave={() => setHover(null)}>
                  <motion.path d={`M0,0 Q${fn.x * 0.5},${fn.y * 0.5 + 20} ${fn.x},${fn.y}`} fill="none" stroke={c} strokeWidth={4} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.05, duration: 0.6 }} />
                  {fn.kids.map((k, j) => (
                    <g key={k.t.id} className="cursor-pointer" onClick={() => navigate(`/traditions/${k.t.id}`)}>
                      <motion.path d={`M${fn.x},${fn.y} C${fn.x * 1.5},${fn.y * 1.5} ${k.x * 0.8},${k.y * 0.8} ${k.x},${k.y}`} fill="none" stroke={c} strokeWidth={1.2} strokeOpacity={0.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 + i * 0.05 + j * 0.01, duration: 0.5 }} />
                      <circle cx={k.x} cy={k.y} r={4} fill={c} />
                      <text
                        transform={`translate(${k.x},${k.y}) rotate(${(k.ang * 180) / Math.PI + (Math.cos(k.ang) < 0 ? 180 : 0)})`}
                        x={Math.cos(k.ang) < 0 ? -8 : 8} dy="0.35em" textAnchor={Math.cos(k.ang) < 0 ? 'end' : 'start'}
                        className="fill-[var(--ink)] text-[9.5px] hover:fill-[var(--accent)]"
                      >{clip(k.t.name, 34)}</text>
                    </g>
                  ))}
                  <g className="cursor-pointer" onClick={() => navigate(`/denominations/${fn.f}`)}>
                    <motion.circle cx={fn.x} cy={fn.y} r={15} fill={c} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.05, type: 'spring' }} />
                    <rect x={fn.x - 62} y={fn.y + 17} width={124} height={16} rx={8} fill="var(--surface)" opacity={0.92} />
                    <text x={fn.x} y={fn.y + 25} textAnchor="middle" dy="0.35em" className="text-[10px] font-bold" style={{ fill: c }}>{clip(famLabel(fn.f), 24)}</text>
                  </g>
                </g>
              );
            })}
            <motion.circle r={46} fill="var(--accent)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
            <motion.circle r={52} fill="none" stroke="var(--accent)" animate={{ r: [50, 64, 50], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 3 }} />
            <text textAnchor="middle" y={-6} className="fill-white text-[20px]">✝</text>
            <text textAnchor="middle" y={14} className="fill-white text-[9px] font-bold">{L('One church', 'ஒரே திருச்சபை')}</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ size */

function SizeView() {
  const a = useAtlas();
  const navigate = useNavigate();
  const W = 1000, H = 520;
  const fams = FAMILY_ORDER.map((f) => {
    const fp = a.familyOf.get(f);
    const sum = a.traditions.filter((t) => t.family === f && t.parentIds.every((p) => a.get<Tradition>('tradition', p)?.family !== f)).reduce((n, t) => n + (membersOf(a, t) ?? 0), 0);
    return { f, value: fp?.members?.estimate ?? sum, source: fp?.members ? `${fp.members.source}, ${fp.members.year}` : L('sum of listed churches', 'பட்டியலிடப்பட்ட சபைகளின் கூட்டுத்தொகை') };
  }).filter((x) => x.value > 0);
  const root = treemap<{ children?: typeof fams; value?: number }>().size([W, H]).paddingInner(3).tile(treemapSquarify)(
    hierarchy<{ children?: typeof fams; value?: number }>({ children: fams }).sum((d) => d.value ?? 0).sort((p, q) => (q.value ?? 0) - (p.value ?? 0)),
  );
  const leaves = root.leaves() as unknown as { x0: number; y0: number; x1: number; y1: number; data: (typeof fams)[number] }[];
  const largest = a.traditions.map((t) => ({ t, n: membersOf(a, t) ?? 0 })).filter((x) => x.n > 0).sort((p, q) => q.n - p.n).slice(0, 20);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Each block is a family of churches, sized by its estimated members. Point for the source; click to open.', 'ஒவ்வொரு கட்டமும் ஒரு சபைக் குடும்பம், அதன் மதிப்பிடப்பட்ட உறுப்பினர்களுக்கேற்ப அளவிடப்பட்டது. மூலத்தைக் காணச் சுட்டுங்கள்; திறக்கச் சொடுக்குங்கள்.')}</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px]">
          {leaves.map((l, i) => {
            const w = l.x1 - l.x0, h = l.y1 - l.y0;
            const c = FAMILIES[l.data.f].colour;
            return (
              <g key={l.data.f} className="cursor-pointer" onClick={() => navigate(`/denominations/${l.data.f}`)}>
                <title>{`${famLabel(l.data.f)}: ${bigNumber(l.data.value)} (${l.data.source})`}</title>
                <motion.rect x={l.x0} y={l.y0} width={w} height={h} rx={8} fill={c} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.9, scale: 1 }} style={{ transformOrigin: `${l.x0 + w / 2}px ${l.y0 + h / 2}px` }} transition={{ delay: i * 0.05 }} whileHover={{ opacity: 1 }} />
                {w > 70 && h > 34 && (
                  <>
                    <text x={l.x0 + 8} y={l.y0 + 18} className="fill-white text-[13px] font-bold">{clip(famLabel(l.data.f), Math.floor(w / 8))}</text>
                    <text x={l.x0 + 8} y={l.y0 + 34} className="fill-white text-[11px] opacity-90">{bigNumber(l.data.value)}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <h3 className="mb-2 mt-6 font-bold">{L('The largest churches and movements in the atlas', 'அட்லஸிலுள்ள மிகப்பெரிய சபைகளும் இயக்கங்களும்')}</h3>
      <div className="space-y-1.5">
        {largest.map(({ t, n }, i) => (
          <Link key={t.id} to={`/traditions/${t.id}`} className="group grid grid-cols-[minmax(0,220px)_1fr] items-center gap-3 text-sm">
            <span className="truncate font-semibold group-hover:text-accent">{t.name}</span>
            <span className="flex items-center gap-2">
              <motion.span className="block h-4 rounded-full" style={{ background: FAMILIES[t.family].colour }} initial={{ width: 0 }} animate={{ width: `${Math.max(1, (n / largest[0].n) * 100)}%` }} transition={{ delay: i * 0.04 }} />
              <span className="shrink-0 text-xs tabular-nums text-muted">{bigNumber(n)}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{L('Overlapping counts: a family-level row (e.g. “Pentecostalism”) includes its member churches, and churches count members differently.', 'எண்ணிக்கைகள் ஒன்றின்மேல் ஒன்று படிகின்றன: குடும்ப அளவிலான வரிசை (எ.கா. “பெந்தெகொஸ்தே இயக்கம்”) அதன் உறுப்புச் சபைகளை உள்ளடக்கும்; சபைகள் உறுப்பினர்களை வெவ்வேறு விதமாக எண்ணுகின்றன.')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ doctrine map */

function DoctrineMap() {
  const a = useAtlas();
  const [sel, setSel] = useState<{ t: Tradition; p: DenomProfile } | null>(null);
  const [axis, setAxis] = useState<(typeof AXES)[number]['key']>('baptism');
  const [fam, setFam] = useState<TraditionFamily | ''>('');
  const items = a.traditions.map((t) => ({ t, p: a.profileOf.get(t.id) })).filter((x): x is { t: Tradition; p: DenomProfile } => !!x.p);
  const cells = new Map<string, typeof items>();
  for (const it of items) { const k = `${it.p.axes.liturgy}-${it.p.axes.sacramental}`; if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(it); }
  const C = 120;
  const ax = AXES.find((x) => x.key === axis)!;
  const fams = FAMILY_ORDER.filter((f) => items.some((x) => x.t.family === f));
  if (!items.length) return <p className="text-muted">{L('Doctrine profiles are being added.', 'கோட்பாட்டு விவரங்கள் சேர்க்கப்படுகின்றன.')}</p>;
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Where each church sits between free and liturgical worship (left to right) and between symbolic and sacramental belief (bottom to top). Each dot is a church; point at it.', 'ஒவ்வொரு சபையும் சுதந்திர, வழிபாட்டு முறை ஆராதனைக்கு இடையிலும் (இடமிருந்து வலம்), அடையாள, அருட்சாதன நம்பிக்கைக்கு இடையிலும் (கீழிருந்து மேல்) எங்கே உள்ளது. ஒவ்வொரு புள்ளியும் ஒரு சபை; அதைச் சுட்டுங்கள்.')}</p>
      <div className="mb-3 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !fam && '!border-accent !text-accent')} onClick={() => setFam('')}>{L('All', 'அனைத்தும்')}</button>
        {fams.map((f) => <button key={f} className={cx('chip cursor-pointer', fam === f && '!border-accent !text-accent')} onClick={() => setFam(fam === f ? '' : f)}><span className="h-2 w-2 rounded-full" style={{ background: FAMILIES[f].colour }} /> {famLabel(f)}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-2">
          <svg viewBox={`-70 -10 ${5 * C + 90} ${5 * C + 70}`} className="min-w-[560px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line x1={i * C} y1={0} x2={i * C} y2={5 * C} stroke="var(--line)" />
                <line x1={0} y1={i * C} x2={5 * C} y2={i * C} stroke="var(--line)" />
                <text x={i * C + C / 2} y={5 * C + 18} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">{(isTA() ? LITURGY_LABELS.ta : LITURGY_LABELS.en)[i]}</text>
                <text x={-6} y={(4 - i) * C + C / 2} textAnchor="end" className="fill-[var(--muted)] text-[10px]">{(isTA() ? SACRAMENT_LABELS.ta : SACRAMENT_LABELS.en)[i].split(' ')[0]}</text>
              </g>
            ))}
            <rect x={0} y={0} width={5 * C} height={5 * C} fill="none" stroke="var(--line)" />
            <text x={2.5 * C} y={5 * C + 40} textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-bold">{L('Worship: free → liturgical', 'ஆராதனை: சுதந்திரம் → வழிபாட்டு முறை')}</text>
            {[...cells.entries()].map(([k, list]) => {
              const [li, sa] = k.split('-').map(Number);
              const cols = Math.ceil(Math.sqrt(list.length));
              const step = Math.min(22, (C - 16) / cols);
              return list.map((it, j) => {
                const cx0 = (li - 1) * C + 8 + (j % cols) * step + step / 2;
                const cy0 = (5 - sa) * C + 8 + Math.floor(j / cols) * step + step / 2;
                const on = !fam || it.t.family === fam;
                return (
                  <motion.circle key={it.t.id} cx={cx0} cy={cy0} r={Math.min(8, step / 2 - 1)} fill={FAMILIES[it.t.family].colour} stroke={sel?.t.id === it.t.id ? 'var(--ink)' : 'none'} strokeWidth={2}
                    initial={{ scale: 0 }} animate={{ scale: 1, opacity: on ? 1 : 0.12 }} transition={{ delay: Math.min(j * 0.02, 0.5) }}
                    onMouseEnter={() => setSel(it)} className="cursor-pointer"><title>{it.t.name}</title></motion.circle>
                );
              });
            })}
          </svg>
        </div>
        <div className="card h-fit p-4">
          {sel ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: FAMILIES[sel.t.family].colour }}>{famLabel(sel.t.family)}</div>
              <Link to={`/traditions/${sel.t.id}`} className="text-lg font-bold hover:text-accent">{sel.t.name}</Link>
              <p className="mb-2 text-sm italic text-ink-2">{sel.p.tagline}</p>
              <AxisChips p={sel.p} />
            </>
          ) : <p className="text-sm text-muted">{L('Point at a dot to see the church and its beliefs.', 'சபையையும் அதன் நம்பிக்கைகளையும் காண ஒரு புள்ளியைச் சுட்டுங்கள்.')}</p>}
        </div>
      </div>

      <h3 className="mb-2 mt-8 font-bold">{L('Compare one question across the families', 'ஒரு கேள்வியைக் குடும்பங்களிடையே ஒப்பிடுக')}</h3>
      <div className="mb-3 flex flex-wrap gap-1">
        {AXES.map((x) => <button key={x.key} className={cx('chip cursor-pointer', axis === x.key && '!border-accent !text-accent')} onClick={() => setAxis(x.key)}>{tl(x)}</button>)}
      </div>
      <div className="card p-4">
        <div className="mb-3 font-semibold">{tl(ax.question)}</div>
        <div className="space-y-1.5">
          {fams.map((f) => {
            const fs = items.filter((x) => x.t.family === f);
            return (
              <div key={f} className="grid grid-cols-[minmax(0,170px)_1fr] items-center gap-3 text-xs">
                <Link to={`/denominations/${f}`} className="truncate font-semibold hover:text-accent">{famLabel(f)}</Link>
                <div className="flex h-5 overflow-hidden rounded-full bg-line">
                  {Object.entries(ax.options).map(([k, o]) => {
                    const n = fs.filter((x) => x.p.axes[axis] === k).length;
                    return n ? <motion.span key={k} title={`${tl(o)}: ${n}`} style={{ background: o.colour }} initial={{ width: 0 }} animate={{ width: `${(n / fs.length) * 100}%` }} transition={{ duration: 0.6 }} /> : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {Object.values(ax.options).map((o) => <span key={o.en} className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: o.colour }} />{tl(o)}</span>)}
        </div>
      </div>
    </div>
  );
}

export function AxisChips({ p }: { p: DenomProfile }) {
  return (
    <dl className="space-y-1.5 text-xs">
      {AXES.map((x) => {
        const o = x.options[p.axes[x.key]];
        return (
          <div key={x.key} className="flex items-center justify-between gap-2">
            <dt className="text-muted">{tl(x)}</dt>
            <dd className="rounded-full px-2 py-0.5 text-right font-semibold text-white" style={{ background: o?.colour ?? '#888' }}>{o ? tl(o) : p.axes[x.key]}</dd>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2"><dt className="text-muted">{L('Worship', 'ஆராதனை')}</dt><dd className="font-semibold">{(isTA() ? LITURGY_LABELS.ta : LITURGY_LABELS.en)[p.axes.liturgy - 1]}</dd></div>
      <div className="flex items-center justify-between gap-2"><dt className="text-muted">{L('Sacraments', 'அருட்சாதனங்கள்')}</dt><dd className="font-semibold">{(isTA() ? SACRAMENT_LABELS.ta : SACRAMENT_LABELS.en)[p.axes.sacramental - 1]}</dd></div>
    </dl>
  );
}

/* ------------------------------------------------------------------ belief finder */

function Finder() {
  const a = useAtlas();
  const [answers, setAnswers] = useState<{ key: (typeof AXES)[number]['key']; value: string }[]>([]);
  const items = a.traditions.map((t) => ({ t, p: a.profileOf.get(t.id) })).filter((x): x is { t: Tradition; p: DenomProfile } => !!x.p && !x.t.endYear);
  const left = items.filter((x) => answers.every((an) => x.p.axes[an.key] === an.value));
  const q = AXES.find((x) => !answers.some((an) => an.key === x.key));
  const fams = FAMILY_ORDER.filter((f) => left.some((x) => x.t.family === f));
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <p className="mb-3 text-sm text-muted">{L('Answer one question at a time and watch which living churches still match. A flowchart of your path builds on the left.', 'ஒவ்வொரு கேள்விக்கும் பதிலளித்து, எந்த இன்றைய சபைகள் இன்னும் பொருந்துகின்றன என்று பாருங்கள். உங்கள் பாதையின் பாய்வுப்படம் இடப்பக்கம் உருவாகிறது.')}</p>
        <div className="flex flex-col items-center">
          <FlowStep label={L('All living churches in the atlas', 'அட்லஸிலுள்ள அனைத்து இன்றைய சபைகளும்')} n={items.length} colour="var(--accent)" />
          {answers.map((an, i) => {
            const ax = AXES.find((x) => x.key === an.key)!;
            const o = ax.options[an.value];
            const n = items.filter((x) => answers.slice(0, i + 1).every((b) => x.p.axes[b.key] === b.value)).length;
            return (
              <div key={an.key} className="flex flex-col items-center">
                <motion.div className="h-6 w-0.5 bg-line" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} />
                <div className="text-[11px] text-muted">{tl(ax.question)}</div>
                <FlowStep label={tl(o)} n={n} colour={o.colour} onRemove={() => setAnswers(answers.slice(0, i))} />
              </div>
            );
          })}
          {q && left.length > 0 && (
            <motion.div key={q.key} className="card mt-4 w-full p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-2 flex items-center gap-2 font-bold"><Icon name="question" className="text-accent" /> {tl(q.question)}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(q.options).map(([k, o]) => {
                  const n = left.filter((x) => x.p.axes[q.key] === k).length;
                  return (
                    <button key={k} disabled={!n} onClick={() => setAnswers([...answers, { key: q.key, value: k }])} className={cx('rounded-xl border-2 p-2 text-left text-sm transition', n ? 'hover:shadow-md' : 'cursor-not-allowed opacity-35')} style={{ borderColor: o.colour }}>
                      <span className="font-semibold">{tl(o)}</span> <span className="text-xs text-muted">· {n}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
          {answers.length > 0 && <button className="chip mt-4 cursor-pointer" onClick={() => setAnswers([])}><Icon name="shuffle" size={12} /> {L('Start again', 'மீண்டும் தொடங்கு')}</button>}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-bold">{left.length} {L('matching churches', 'பொருந்தும் சபைகள்')}</div>
        <div className="space-y-3">
          {fams.map((f) => (
            <motion.div key={f} layout className="card p-3" style={{ borderLeft: `4px solid ${FAMILIES[f].colour}` }}>
              <div className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: FAMILIES[f].colour }}>{famLabel(f)}</div>
              <div className="flex flex-wrap gap-1">
                {left.filter((x) => x.t.family === f).map((x) => <Link key={x.t.id} to={`/traditions/${x.t.id}`} className="chip hover:!border-accent hover:!text-accent">{x.t.name}</Link>)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowStep({ label, n, colour, onRemove }: { label: string; n: number; colour: string; onRemove?: () => void }) {
  return (
    <motion.div className="flex w-full max-w-xs items-center gap-2 rounded-xl border-2 bg-surface px-3 py-2 text-sm shadow-sm" style={{ borderColor: colour }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      <span className="min-w-0 flex-1 font-semibold">{label}</span>
      <span className="rounded-full px-2 text-xs font-bold text-white" style={{ background: colour }}>{n}</span>
      {onRemove && <button onClick={onRemove} className="text-muted hover:text-accent" aria-label="remove"><Icon name="close" size={12} /></button>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ influence web */

function InfluenceWeb() {
  const a = useAtlas();
  const navigate = useNavigate();
  const [level, setLevel] = useState<'family' | 'church'>('family');
  const [sel, setSel] = useState<string | undefined>();
  const g = useMemo(() => {
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    if (level === 'family') {
      for (const fp of a.familyProfiles) {
        nodes.push({ id: fp.id, label: famLabel(fp.id), sub: fp.origin.year > 0 ? String(fp.origin.year) : '', colour: FAMILIES[fp.id].colour, title: fp.tagline });
        for (const x of fp.influencedFamilies) edges.push({ from: fp.id, to: x.family, colour: FAMILIES[fp.id].colour });
      }
    } else {
      const ids = new Set<string>();
      for (const p of a.denomProfiles) for (const x of p.influencedBy) if (x.traditionId && x.traditionId !== p.id) { edges.push({ from: x.traditionId, to: p.id }); ids.add(x.traditionId); ids.add(p.id); }
      for (const p of a.denomProfiles) for (const x of p.influenced) if (x.traditionId && x.traditionId !== p.id) { edges.push({ from: p.id, to: x.traditionId }); ids.add(x.traditionId); ids.add(p.id); }
      for (const id of ids) { const t = a.get<Tradition>('tradition', id); if (t) nodes.push({ id, label: t.name, sub: famLabel(t.family), colour: FAMILIES[t.family].colour, title: a.profileOf.get(id)?.tagline }); }
      for (const e of edges) e.colour = FAMILIES[a.get<Tradition>('tradition', e.from)?.family ?? 'early'].colour;
    }
    return { nodes, edges: [...new Map(edges.map((e) => [`${e.from}>${e.to}`, e])).values()] };
  }, [a, level]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={cx('chip cursor-pointer', level === 'family' && '!border-accent !text-accent')} onClick={() => { setLevel('family'); setSel(undefined); }}>{L('Between families', 'குடும்பங்களுக்கிடையே')}</button>
        <button className={cx('chip cursor-pointer', level === 'church' && '!border-accent !text-accent')} onClick={() => { setLevel('church'); setSel(undefined); }}>{L('Between churches', 'சபைகளுக்கிடையே')}</button>
        <span className="text-sm text-muted">{L('Arrows run from the influencer to the influenced. Click a box to highlight its links; click again to open it.', 'அம்புகள் தாக்கம் செலுத்தியவரிடமிருந்து தாக்கம் பெற்றவரை நோக்கிச் செல்கின்றன. இணைப்புகளை ஒளிரச் செய்ய ஒரு பெட்டியைச் சொடுக்குங்கள்; திறக்க மீண்டும் சொடுக்குங்கள்.')}</span>
      </div>
      {level === 'family' ? <FamilyCircle onOpen={(f) => navigate(`/denominations/${f}`)} /> : g.nodes.length ? (
        <GraphFlow view={{ x: 30, y: 30, zoom: 0.8 }} nodes={g.nodes} edges={g.edges} dir="LR" height={680} selected={sel} onSelect={(id) => (sel === id ? navigate(`/traditions/${id}`) : setSel(id))} />
      ) : <p className="text-muted">{L('Influences are being added.', 'தாக்கங்கள் சேர்க்கப்படுகின்றன.')}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ family cards */

function FamilyCards() {
  const a = useAtlas();
  const fams = FAMILY_ORDER.filter((f) => a.traditions.some((t) => t.family === f));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fams.map((f, i) => {
        const fp = a.familyOf.get(f);
        const n = a.traditions.filter((t) => t.family === f).length;
        return (
          <motion.div key={f} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={`/denominations/${f}`} className="card group flex h-full flex-col overflow-hidden p-4 transition-shadow hover:shadow-lg" style={{ borderTop: `5px solid ${FAMILIES[f].colour}` }}>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: FAMILIES[f].colour }}><Icon name={FAMILIES[f].icon} size={18} /></span>
                <span className="font-bold group-hover:text-accent">{famLabel(f)}</span>
              </div>
              {fp && <p className="mb-2 text-sm italic text-ink-2">{fp.tagline}</p>}
              <div className="mt-auto flex flex-wrap gap-2 text-xs text-muted">
                <span className="chip">{n} {L('churches', 'சபைகள்')}</span>
                {fp?.members && <span className="chip">{bigNumber(fp.members.estimate)} {L('members', 'உறுப்பினர்கள்')}</span>}
                {fp && <span className="chip">{L('from', 'தோற்றம்')} {fp.origin.year}</span>}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Families on a circle; arcs show which family shaped which. Point at a family to light its links. */
function FamilyCircle({ onOpen }: { onOpen: (f: TraditionFamily) => void }) {
  const a = useAtlas();
  const [hover, setHover] = useState<TraditionFamily | null>(null);
  const fams = FAMILY_ORDER.filter((f) => a.familyOf.has(f));
  const R = 300;
  const pos = new Map(fams.map((f, i) => { const ang = (i / fams.length) * Math.PI * 2 - Math.PI / 2; return [f, { x: Math.cos(ang) * R, y: Math.sin(ang) * R, ang }]; }));
  const links = fams.flatMap((f) => a.familyOf.get(f)!.influencedFamilies.filter((x) => pos.has(x.family) && x.family !== f).map((x) => ({ from: f, to: x.family, text: x.text })));
  const on = (l: { from: string; to: string }) => !hover || l.from === hover || l.to === hover;
  const info = hover ? links.filter((l) => l.from === hover) : [];
  const into = hover ? links.filter((l) => l.to === hover) : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-line bg-surface-2 p-2">
        <svg viewBox="-470 -400 940 800" className="w-full">
          <defs>
            {fams.map((f) => (
              <marker key={f} id={`arr-${f}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={FAMILIES[f].colour} /></marker>
            ))}
          </defs>
          {links.map((l, i) => {
            const p = pos.get(l.from)!, q = pos.get(l.to)!;
            const k = 0.25;
            const ex = q.x * (1 - 26 / R), ey = q.y * (1 - 26 / R);
            return (
              <motion.path key={i} d={`M${p.x * 0.93},${p.y * 0.93} Q${(p.x + q.x) * k},${(p.y + q.y) * k} ${ex},${ey}`} fill="none" stroke={FAMILIES[l.from].colour}
                strokeWidth={hover && on(l) ? 3 : 1.6} markerEnd={`url(#arr-${l.from})`}
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: on(l) ? 0.85 : 0.06 }} transition={{ duration: 0.9, delay: Math.min(i, 40) * 0.02 }} />
            );
          })}
          {fams.map((f, i) => {
            const p = pos.get(f)!;
            const right = Math.cos(p.ang) >= -0.01;
            return (
              <g key={f} className="cursor-pointer" onMouseEnter={() => setHover(f)} onMouseLeave={() => setHover(null)} onClick={() => onOpen(f)} opacity={hover && hover !== f && !links.some((l) => (l.from === hover && l.to === f) || (l.to === hover && l.from === f)) ? 0.3 : 1}>
                <motion.circle cx={p.x} cy={p.y} r={hover === f ? 20 : 15} fill={FAMILIES[f].colour} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04, type: 'spring' }} />
                <text x={p.x + (right ? 24 : -24)} y={p.y} dy="0.35em" textAnchor={right ? 'start' : 'end'} className="text-[13px] font-bold" style={{ fill: FAMILIES[f].colour }}>{famLabel(f)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="card h-fit p-4">
        {hover ? (
          <>
            <div className="mb-2 text-lg font-bold" style={{ color: FAMILIES[hover].colour }}>{famLabel(hover)}</div>
            {info.length > 0 && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{L('It shaped', 'இது வடிவமைத்தவை')}</div>}
            <ul className="mb-3 space-y-1.5 text-sm">{info.map((l, i) => <li key={i}><b style={{ color: FAMILIES[l.to].colour }}>{famLabel(l.to)}</b>: {l.text}</li>)}</ul>
            {into.length > 0 && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{L('Shaped by', 'இதை வடிவமைத்தவை')}</div>}
            <ul className="space-y-1 text-sm">{into.map((l, i) => <li key={i}><b style={{ color: FAMILIES[l.from].colour }}>{famLabel(l.from)}</b></li>)}</ul>
          </>
        ) : <p className="text-sm text-muted">{L('Point at a family to see whom it shaped and who shaped it; click to open it.', 'ஒரு குடும்பம் யாரை வடிவமைத்தது, அதை யார் வடிவமைத்தனர் என்று காண அதைச் சுட்டுங்கள்; திறக்கச் சொடுக்குங்கள்.')}</p>}
      </div>
    </div>
  );
}
