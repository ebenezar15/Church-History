import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { ChurchFather, Doctrine } from '../data/schema';
import { L } from '../data/missions';
import { LANG_META, ROOTS, ROOT_GROUPS, ROOT_META, SCHOOLS, SCHOOL_META, lbl, lifeSpan } from '../data/roots';
import { Icon } from '../components/Icon';
import { CountUp, PageHeader, Tabs, cx } from '../components/ui';
import { MissionMap } from '../viz/MissionMap';
import { GraphFlow, type GEdge, type GLane, type GNode } from '../viz/GraphFlow';

type View = 'tree' | 'roots' | 'heat' | 'lives' | 'map' | 'schools';
const mid = (f: ChurchFather) => f.born ?? (f.died !== undefined ? f.died - 60 : 300);
const COUNCILS: [number, string, string][] = [
  [325, 'Nicaea I', 'நிசேயா I'], [381, 'Constantinople I', 'கான்ஸ்டான்டிநோபிள் I'], [431, 'Ephesus', 'எபேசு'], [451, 'Chalcedon', 'கல்சிதோன்'],
  [553, 'Constantinople II', 'கான்ஸ்டான்டிநோபிள் II'], [681, 'Constantinople III', 'கான்ஸ்டான்டிநோபிள் III'], [787, 'Nicaea II', 'நிசேயா II'],
];

export default function Fathers() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'tree';
  const setView = (v: View) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const [school, setSchool] = useState('');
  const list = useMemo(() => a.fathers.filter((f) => !school || f.school === school), [a, school]);
  const schools = useMemo(() => SCHOOLS.filter((s) => a.fathers.some((f) => f.school === s)), [a]);
  const works = a.fathers.reduce((n, f) => n + f.works.length, 0);
  const links = a.fathers.reduce((n, f) => n + f.roots.length, 0);

  return (
    <div>
      <PageHeader eyebrow={L('Think', 'சிந்திக்க')} icon="quill" title={L('Church Fathers: Roots & Influences', 'திருச்சபைத் தந்தையர்: வேர்களும் தாக்கங்களும்')}>
        {L(
          'The teachers of the first eight centuries who shaped Christian doctrine, worship and Bible reading. Where their ideas came from (Scripture and Judaism, Greek philosophy, Roman law and rhetoric, the fight against Gnosticism, earlier Fathers and the desert monks), who taught whom, what each contributed to doctrine, and how Catholic, Orthodox, Oriental and Protestant churches receive them today.',
          'முதல் எட்டு நூற்றாண்டுகளில் கிறிஸ்தவக் கோட்பாடு, வழிபாடு, வேதவாசிப்பு ஆகியவற்றை வடிவமைத்த ஆசிரியர்கள். அவர்களின் கருத்துகள் எங்கிருந்து வந்தன (வேதமும் யூத மதமும், கிரேக்கத் தத்துவம், ரோமச் சட்டமும் சொல்லாட்சியும், ஞானக்கொள்கைக்கு எதிரான போராட்டம், முந்தைய தந்தையர், பாலைவனத் துறவிகள்), யார் யாருக்குக் கற்பித்தார்கள், ஒவ்வொருவரும் கோட்பாட்டுக்கு அளித்த பங்களிப்பு, இன்று கத்தோலிக்க, ஆர்த்தடாக்ஸ், கீழைத்தேய, புராட்டஸ்டன்ட் சபைகள் அவர்களை எவ்வாறு ஏற்கின்றன.',
        )}
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [a.fathers.length, L('Fathers', 'தந்தையர்'), 'quill'],
          [schools.length, L('schools & streams', 'பள்ளிகளும் மரபுகளும்'), 'branch'],
          [links, L('roots traced', 'கண்டறியப்பட்ட வேர்கள்'), 'tree'],
          [works, L('key writings', 'முக்கிய நூல்கள்'), 'book'],
        ] as const).map(([n, label, icon], i) => (
          <motion.div key={i} className="card p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Icon name={icon} className="mb-1 text-accent" />
            <div className="text-2xl font-bold text-ink"><CountUp to={n} /></div>
            <div className="text-xs text-muted">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="mb-4">
        <Tabs
          layoutId="fathers-tabs"
          value={view}
          onChange={setView}
          tabs={[
            { id: 'tree', label: L('Who taught whom', 'யார் யாருக்குக் கற்பித்தார்'), icon: 'branch' },
            { id: 'roots', label: L('Roots → Fathers → doctrine', 'வேர்கள் → தந்தையர் → கோட்பாடு'), icon: 'tree' },
            { id: 'heat', label: L('Roots heat map', 'வேர்களின் வெப்ப வரைபடம்'), icon: 'layers' },
            { id: 'lives', label: L('Lifespans & councils', 'வாழ்நாட்களும் சங்கங்களும்'), icon: 'timeline' },
            { id: 'map', label: L('Map', 'வரைபடம்'), icon: 'map' },
            { id: 'schools', label: L('Schools', 'பள்ளிகள்'), icon: 'people' },
          ]}
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-1">
        <button className={cx('chip cursor-pointer', !school && '!border-accent !text-accent')} onClick={() => setSchool('')}>{L('All', 'அனைத்தும்')}</button>
        {schools.map((s) => (
          <button key={s} className={cx('chip cursor-pointer', school === s && '!border-accent !text-accent')} onClick={() => setSchool(school === s ? '' : s)}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: SCHOOL_META[s].colour }} /> {lbl(SCHOOL_META[s])}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {!list.length && <p className="text-muted">{L('The Fathers are being added.', 'தந்தையர் சேர்க்கப்படுகிறார்கள்.')}</p>}
          {list.length > 0 && view === 'tree' && <Lineage list={list} all={a.fathers} />}
          {list.length > 0 && view === 'roots' && <RootsFlow list={list} doctrine={(id) => a.get<Doctrine>('doctrine', id)?.name ?? id} />}
          {list.length > 0 && view === 'heat' && <Heat list={list} />}
          {list.length > 0 && view === 'lives' && <Lives list={list} />}
          {list.length > 0 && view === 'map' && <FathersMap list={list} />}
          {list.length > 0 && view === 'schools' && <Schools list={list} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Teacher → pupil flowchart: one lane per school, left-to-right by date. */
function Lineage({ list, all }: { list: ChurchFather[]; all: ChurchFather[] }) {
  const navigate = useNavigate();
  const g = useMemo(() => {
    const ids = new Set(list.map((f) => f.id));
    const nodes: GNode[] = [];
    const lanes: GLane[] = [];
    let y = 0;
    for (const s of SCHOOLS) {
      const fs = list.filter((f) => f.school === s).sort((p, q) => mid(p) - mid(q));
      if (!fs.length) continue;
      const rows: number[] = [];
      const placed = fs.map((f) => {
        const x = (mid(f) - 30) * 5.2;
        let r = rows.findIndex((last) => x > last + 228);
        if (r < 0) { r = rows.length; rows.push(x); } else rows[r] = x;
        return { f, x, r };
      });
      lanes.push({ y: y + 18, label: lbl(SCHOOL_META[s]), colour: SCHOOL_META[s].colour });
      for (const { f, x, r } of placed) {
        nodes.push({ id: f.id, label: f.name, sub: lifeSpan(f), colour: SCHOOL_META[s].colour, badge: lbl(LANG_META[f.language]), badgeColour: LANG_META[f.language].colour, x, y: y + r * 84, title: f.summary });
      }
      y += rows.length * 84 + 40;
    }
    const edges: GEdge[] = [];
    for (const f of list) for (const t of f.teachers) if (ids.has(t)) edges.push({ from: t, to: f.id, colour: SCHOOL_META[all.find((x) => x.id === t)?.school ?? f.school].colour });
    return { nodes, edges, lanes, height: y };
  }, [list, all]);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Arrows run from teacher (or direct influence) to pupil. Each band is a school; click a Father to open his page.', 'அம்புகள் ஆசிரியரிடமிருந்து (அல்லது நேரடித் தாக்கத்திலிருந்து) மாணவரை நோக்கிச் செல்கின்றன. ஒவ்வொரு பட்டையும் ஒரு பள்ளி; ஒரு தந்தையின் பக்கத்தைத் திறக்க அவரைச் சொடுக்குங்கள்.')}</p>
      <GraphFlow nodes={g.nodes} edges={g.edges} lanes={g.lanes} height={Math.min(760, Math.max(480, g.height * 0.6))} onSelect={(id) => navigate(`/fathers/${id}`)} view={{ x: 290, y: 20, zoom: 0.78 }} />
    </div>
  );
}

/** Three columns: roots on the left, Fathers in the middle, doctrines on the right, joined by animated curves. */
function RootsFlow({ list, doctrine }: { list: ChurchFather[]; doctrine: (id: string) => string }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);
  const fathers = [...list].sort((p, q) => mid(p) - mid(q));
  const roots = ROOTS.filter((r) => fathers.some((f) => f.roots.some((x) => x.root === r)));
  const docs = [...new Set(fathers.flatMap((f) => f.doctrineContributions.map((d) => d.doctrineId)))];
  const ROW = 24;
  const H = Math.max(fathers.length, roots.length, docs.length) * ROW + 40;
  const yOf = (i: number, n: number) => 20 + (i + 0.5) * ((H - 40) / n);
  const X = [175, 470, 755];
  const links: { k: string; a: string; b: string; d: string; c: string }[] = [];
  fathers.forEach((f, fi) => {
    const fy = yOf(fi, fathers.length);
    for (const r of f.roots) {
      const ry = yOf(roots.indexOf(r.root), roots.length);
      links.push({ k: `${r.root}-${f.id}`, a: `r:${r.root}`, b: `f:${f.id}`, c: ROOT_META[r.root].colour, d: `M${X[0] + 6},${ry} C${X[0] + 160},${ry} ${X[1] - 260},${fy} ${X[1] - 120},${fy}` });
    }
    for (const d of f.doctrineContributions) {
      const dy = yOf(docs.indexOf(d.doctrineId), docs.length);
      links.push({ k: `${f.id}-${d.doctrineId}`, a: `f:${f.id}`, b: `d:${d.doctrineId}`, c: SCHOOL_META[f.school].colour, d: `M${X[1] + 120},${fy} C${X[1] + 260},${fy} ${X[2] - 160},${dy} ${X[2] - 6},${dy}` });
    }
  });
  const near = new Set<string>();
  if (hover) {
    near.add(hover);
    for (const l of links) if (l.a === hover || l.b === hover) { near.add(l.a); near.add(l.b); }
    // Two hops so hovering a root lights its doctrines, and vice versa.
    if (!hover.startsWith('f:')) for (const l of links) if (near.has(l.a) && l.a.startsWith('f:')) near.add(l.b); else if (near.has(l.b) && l.b.startsWith('f:')) near.add(l.a);
  }
  const on = (l: { a: string; b: string }) => !hover || (near.has(l.a) && near.has(l.b) && (hover.startsWith('f:') ? l.a === hover || l.b === hover : true));
  const dim = (id: string) => (hover && !near.has(id) ? 0.2 : 1);

  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Point at a root, a Father or a doctrine to trace its lines. Roots are what shaped each Father; the right side is the doctrine he helped define.', 'ஒரு வேர், தந்தை அல்லது கோட்பாட்டைச் சுட்டி அதன் கோடுகளைப் பின்தொடருங்கள். வேர்கள் ஒவ்வொரு தந்தையையும் வடிவமைத்தவை; வலது பக்கம் அவர் வரையறுக்க உதவிய கோட்பாடு.')}</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-2">
        <svg viewBox={`-70 0 1150 ${H}`} className="min-w-[820px]" style={{ width: '100%' }}>
          {[L('Roots', 'வேர்கள்'), L('Fathers', 'தந்தையர்'), L('Doctrine', 'கோட்பாடு')].map((t, i) => (
            <text key={i} x={X[i]} y={12} textAnchor="middle" className="fill-[var(--muted)] text-[11px] font-bold uppercase tracking-widest">{t}</text>
          ))}
          {links.map((l, i) => (
            <motion.path key={l.k} d={l.d} fill="none" stroke={l.c} strokeWidth={on(l) && hover ? 2.2 : 1.2} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: on(l) ? 0.75 : 0.05 }} transition={{ duration: 0.8, delay: Math.min(i, 120) * 0.006 }} />
          ))}
          {roots.map((r, i) => (
            <g key={r} transform={`translate(${X[0]},${yOf(i, roots.length)})`} opacity={dim(`r:${r}`)} onMouseEnter={() => setHover(`r:${r}`)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <circle r={6} fill={ROOT_META[r].colour} />
              <text x={-12} dy="0.35em" textAnchor="end" className="fill-[var(--ink)] text-[12px] font-semibold">{lbl(ROOT_META[r])}</text>
            </g>
          ))}
          {fathers.map((f, i) => (
            <g key={f.id} transform={`translate(${X[1]},${yOf(i, fathers.length)})`} opacity={dim(`f:${f.id}`)} onMouseEnter={() => setHover(`f:${f.id}`)} onMouseLeave={() => setHover(null)} onClick={() => navigate(`/fathers/${f.id}`)} className="cursor-pointer">
              <rect x={-118} y={-10} width={236} height={20} rx={10} fill="var(--surface)" stroke={SCHOOL_META[f.school].colour} />
              <text dy="0.35em" textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-semibold">{f.name.length > 34 ? `${f.name.slice(0, 33)}…` : f.name}</text>
            </g>
          ))}
          {docs.map((d, i) => (
            <g key={d} transform={`translate(${X[2]},${yOf(i, docs.length)})`} opacity={dim(`d:${d}`)} onMouseEnter={() => setHover(`d:${d}`)} onMouseLeave={() => setHover(null)} onClick={() => navigate(`/doctrines?open=${d}`)} className="cursor-pointer">
              <circle r={6} fill="var(--accent)" />
              <text x={12} dy="0.35em" className="fill-[var(--ink)] text-[12px] font-semibold">{doctrine(d).length > 30 ? `${doctrine(d).slice(0, 29)}…` : doctrine(d)}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {Object.values(ROOT_GROUPS).map((g) => <span key={g.en} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: g.colour }} />{lbl(g)}</span>)}
      </div>
    </div>
  );
}

/** Fathers × roots matrix; each lit cell is a documented influence (hover to read it). */
function Heat({ list }: { list: ChurchFather[] }) {
  const [tip, setTip] = useState<{ f: ChurchFather; root: string; text: string } | null>(null);
  const fathers = [...list].sort((p, q) => mid(p) - mid(q));
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{L('Each lit square means that root shaped that Father. Point at a square to read how.', 'ஒளிரும் ஒவ்வொரு சதுரமும் அந்த வேர் அந்தத் தந்தையை வடிவமைத்தது என்பதைக் குறிக்கிறது. எப்படி என்று படிக்க சதுரத்தைச் சுட்டுங்கள்.')}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-3">
          <table className="border-separate border-spacing-[3px] text-xs">
            <thead>
              <tr>
                <th />
                {ROOTS.map((r) => (
                  <th key={r} className="h-32 w-6 align-bottom"><div className="w-6 origin-bottom-left translate-x-3 -rotate-60 whitespace-nowrap text-left font-semibold" style={{ color: ROOT_META[r].colour }}>{lbl(ROOT_META[r])}</div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fathers.map((f, i) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap pr-2 text-right"><Link to={`/fathers/${f.id}`} className="font-semibold hover:text-accent" style={{ borderLeft: `3px solid ${SCHOOL_META[f.school].colour}`, paddingLeft: 4 }}>{f.name.length > 28 ? `${f.name.slice(0, 27)}…` : f.name}</Link></td>
                  {ROOTS.map((r) => {
                    const hit = f.roots.find((x) => x.root === r);
                    return (
                      <td key={r} className="p-0">
                        <motion.div
                          className="h-6 w-6 rounded"
                          style={{ background: hit ? ROOT_META[r].colour : 'var(--line)', opacity: hit ? 1 : 0.35 }}
                          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: Math.min(i * 0.02, 0.6) }}
                          whileHover={hit ? { scale: 1.3 } : undefined}
                          onMouseEnter={() => hit && setTip({ f, root: r, text: hit.text })}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="pr-2 text-right font-bold text-muted">{L('Total', 'மொத்தம்')}</td>
                {ROOTS.map((r) => <td key={r} className="text-center font-bold tabular-nums" style={{ color: ROOT_META[r].colour }}>{fathers.filter((f) => f.roots.some((x) => x.root === r)).length}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card sticky top-20 h-fit p-4">
          {tip ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: ROOT_META[tip.root as keyof typeof ROOT_META].colour }}>{lbl(ROOT_META[tip.root as keyof typeof ROOT_META])}</div>
              <div className="font-bold">{tip.f.name}</div>
              <p className="mt-1 text-sm text-ink-2">{tip.text}</p>
            </>
          ) : <p className="text-sm text-muted">{L('Point at a coloured square.', 'ஒரு வண்ணச் சதுரத்தைச் சுட்டுங்கள்.')}</p>}
        </div>
      </div>
    </div>
  );
}

/** Lifespan bars against the great councils. */
function Lives({ list }: { list: ChurchFather[] }) {
  const fathers = [...list].sort((p, q) => mid(p) - mid(q));
  const Y0 = 30, Y1 = 820;
  const x = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 p-4">
      <div className="relative min-w-[720px]">
        <div className="relative mb-2 ml-[180px] h-6 text-[10px] text-muted">
          {[100, 200, 300, 400, 500, 600, 700, 800].map((y) => <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${x(y)}%` }}>{y}</span>)}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-[180px] right-0">
            {COUNCILS.map(([y, en, ta], i) => (
              <div key={y} className="absolute inset-y-0 border-l border-dashed border-accent/50" style={{ left: `${x(y)}%` }}>
                <span className="absolute left-1 whitespace-nowrap rounded bg-surface-2 px-0.5 text-[9px] font-bold text-accent" style={{ top: -4 + (i % 3) * 11 }}>{L(en, ta)} {y}</span>
              </div>
            ))}
          </div>
          {fathers.map((f, i) => {
            const b = f.born ?? (f.died ?? 300) - 60;
            const d = f.died ?? b + 60;
            const c = SCHOOL_META[f.school].colour;
            return (
              <Link key={f.id} to={`/fathers/${f.id}`} className="group relative flex h-7 items-center">
                <span className="w-[180px] shrink-0 truncate pr-2 text-right text-xs font-semibold group-hover:text-accent">{f.name}</span>
                <span className="relative h-full flex-1">
                  <motion.span
                    className="absolute top-1.5 flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold text-white"
                    style={{ left: `${x(b)}%`, width: `${Math.max(1.5, x(d) - x(b))}%`, background: c, transformOrigin: 'left' }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.03, duration: 0.5 }}
                  >
                    <span className="truncate">{lbl(LANG_META[f.language])}</span>
                  </motion.span>
                  <span className="absolute top-1.5 ml-1 whitespace-nowrap text-[10px] text-muted opacity-0 group-hover:opacity-100" style={{ left: `${x(d)}%` }}>{lifeSpan(f)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FathersMap({ list }: { list: ChurchFather[] }) {
  const [sel, setSel] = useState<string | undefined>();
  const f = list.find((x) => x.id === sel);
  const route = f && f.places.length > 1 ? [{ id: f.id, title: f.name, colour: SCHOOL_META[f.school].colour, year: mid(f), stops: [...f.places].sort((p, q) => (p.year ?? 0) - (q.year ?? 0)) }] : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <MissionMap
        focus={{ lng: [-12, 58], lat: [22, 52] }}
        routes={route}
        points={list.map((x) => ({ id: x.id, name: x.name, lng: x.see.lng, lat: x.see.lat, colour: SCHOOL_META[x.school].colour, year: mid(x), size: x.id === sel ? 7 : 4.5, label: x.id === sel }))}
        selected={sel}
        onSelect={(_, id) => setSel(id === sel ? undefined : id)}
      />
      <div className="card h-fit p-4">
        {f ? (
          <>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: SCHOOL_META[f.school].colour }}>{lbl(SCHOOL_META[f.school])} · {lifeSpan(f)}</div>
            <div className="text-lg font-bold">{f.name}</div>
            <div className="text-sm text-muted">{f.see.name}</div>
            <p className="mt-2 text-sm text-ink-2">{f.summary}</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-2">{f.places.map((p, i) => <li key={i}>• {p.name}{p.year ? ` (${p.year})` : ''}</li>)}</ul>
            <Link to={`/fathers/${f.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">{L('Open', 'திற')} <Icon name="arrow" size={14} /></Link>
          </>
        ) : <p className="text-sm text-muted">{L('Click a dot to see a Father’s city and the journey of his life.', 'ஒரு தந்தையின் நகரத்தையும் வாழ்க்கைப் பயணத்தையும் காண ஒரு புள்ளியைச் சொடுக்குங்கள்.')}</p>}
      </div>
    </div>
  );
}

function Schools({ list }: { list: ChurchFather[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SCHOOLS.filter((s) => list.some((f) => f.school === s)).map((s, i) => {
        const fs = list.filter((f) => f.school === s).sort((p, q) => mid(p) - mid(q));
        const counts = ROOTS.map((r) => ({ r, n: fs.filter((f) => f.roots.some((x) => x.root === r)).length })).filter((x) => x.n).sort((p, q) => q.n - p.n).slice(0, 5);
        return (
          <motion.div key={s} className="card overflow-hidden p-4" style={{ borderTop: `5px solid ${SCHOOL_META[s].colour}` }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="mb-2 text-lg font-bold" style={{ color: SCHOOL_META[s].colour }}>{lbl(SCHOOL_META[s])}</div>
            <ul className="mb-3 space-y-1">
              {fs.map((f) => (
                <li key={f.id}><Link to={`/fathers/${f.id}`} className="flex items-baseline gap-2 hover:text-accent"><span className="font-semibold">{f.name}</span><span className="text-xs tabular-nums text-muted">{lifeSpan(f)}</span></Link></li>
              ))}
            </ul>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{L('Main roots', 'முக்கிய வேர்கள்')}</div>
            <div className="mt-1 space-y-1">
              {counts.map(({ r, n }) => (
                <div key={r} className="flex items-center gap-2 text-xs">
                  <span className="w-36 shrink-0 truncate">{lbl(ROOT_META[r])}</span>
                  <span className="h-2 flex-1 rounded-full bg-line"><motion.span className="block h-full rounded-full" style={{ background: ROOT_META[r].colour }} initial={{ width: 0 }} animate={{ width: `${(n / fs.length) * 100}%` }} transition={{ delay: 0.2 + i * 0.05 }} /></span>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
