/**
 * The offline Atlas Guide: answers questions entirely in the browser (or in Node) from the atlas data,
 * with no AI service, API key or network. It recognises the entries a question names, works out what
 * kind of question it is (who / when / why / compare / lineage / beliefs / views / arguments / timeline),
 * and writes the answer from the entries' own sourced fields, linking every entry it uses.
 */
import type { Atlas } from '../data/db';
import type {
  Controversy, Doctrine, EntityType, Era, Event, Experience, Person, Position, Quote, Tradition, Work, Comparison, StudyPath,
} from '../data/schema';
import { FAMILIES, formatSpan, formatYear } from '../data/families';
import { getFuse } from '../data/searchIndex';

export interface Ref { type: EntityType; id: string }
export interface OfflineAnswer { text: string; steps: string[]; focus?: Ref; related: Ref[] }

// ---------- text helpers ----------

/** Lower-cases, strips accents and punctuation, and lightly stems ("substitutionary" ≈ "substitution", plurals). */
const norm = (s: string) =>
  ' ' +
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ')
    .map((w) => (w.length > 5 && w.endsWith('ary') ? w.slice(0, -3) : w.length > 4 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is') ? w.slice(0, -1) : w))
    .join(' ') +
  ' ';

const link = (type: EntityType, id: string, label: string) => `[${label.replace(/[[\]]/g, '')}](entity:${type}/${id})`;
const clip = (s: string, n = 260) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s);
const bullets = (items: string[], n = 4) => items.slice(0, n).map((x) => `- ${x}`).join('\n');

const STOP = new Set(
  'the a an of and or in on at to for from by with about what who whom whose when where why how which is are was were be been do does did can could would should tell me explain describe give show list between difference compare versus vs this that these those their his her its church churches christian christianity christians believe believes teach teaches view views think'.split(' '),
);

// Common words people use that the atlas names differently.
const ALIASES: Record<string, Ref> = {
  catholic: { type: 'tradition', id: 'catholic' }, catholics: { type: 'tradition', id: 'catholic' }, 'roman catholic': { type: 'tradition', id: 'catholic' },
  orthodox: { type: 'tradition', id: 'eastern-orthodox' }, 'eastern orthodox': { type: 'tradition', id: 'eastern-orthodox' },
  protestant: { type: 'tradition', id: 'lutheran' }, lutherans: { type: 'tradition', id: 'lutheran' }, calvinists: { type: 'tradition', id: 'reformed' },
  anglicans: { type: 'tradition', id: 'anglican' }, episcopalians: { type: 'tradition', id: 'episcopal-church-usa' },
  methodists: { type: 'tradition', id: 'methodist' }, baptists: { type: 'tradition', id: 'baptist' }, pentecostals: { type: 'tradition', id: 'pentecostal' },
  quakers: { type: 'tradition', id: 'quaker' }, mormons: { type: 'tradition', id: 'latter-day-saints' }, mormon: { type: 'tradition', id: 'latter-day-saints' },
  copts: { type: 'tradition', id: 'coptic-orthodox' }, nestorians: { type: 'tradition', id: 'church-of-the-east' }, adventists: { type: 'tradition', id: 'seventh-day-adventist' },
  'end times': { type: 'doctrine', id: 'eschatology' }, 'last things': { type: 'doctrine', id: 'eschatology' }, millennium: { type: 'doctrine', id: 'eschatology' },
  rapture: { type: 'doctrine', id: 'eschatology' }, infallible: { type: 'position', id: 'papal-infallibility' }, pope: { type: 'position', id: 'papal-infallibility' }, heaven: { type: 'doctrine', id: 'eschatology' }, hell: { type: 'doctrine', id: 'salvation' },
  grace: { type: 'doctrine', id: 'salvation' }, justification: { type: 'doctrine', id: 'salvation' }, predestination: { type: 'doctrine', id: 'salvation' },
  cross: { type: 'doctrine', id: 'atonement' }, eucharist: { type: 'doctrine', id: 'church-sacraments' }, communion: { type: 'doctrine', id: 'church-sacraments' },
  'lords supper': { type: 'doctrine', id: 'church-sacraments' }, sacraments: { type: 'doctrine', id: 'church-sacraments' }, bible: { type: 'doctrine', id: 'scripture-authority' },
  scripture: { type: 'doctrine', id: 'scripture-authority' }, canon: { type: 'doctrine', id: 'scripture-authority' }, mary: { type: 'doctrine', id: 'mary-saints' },
  saints: { type: 'doctrine', id: 'mary-saints' }, icons: { type: 'doctrine', id: 'mary-saints' }, 'holy spirit': { type: 'doctrine', id: 'holy-spirit' },
  tongues: { type: 'doctrine', id: 'holy-spirit' }, 'spiritual gifts': { type: 'doctrine', id: 'holy-spirit' }, jesus: { type: 'doctrine', id: 'christology' },
  christ: { type: 'doctrine', id: 'christology' }, god: { type: 'doctrine', id: 'trinity' }, war: { type: 'doctrine', id: 'ethics-church-state' },
  prayer: { type: 'doctrine', id: 'spirituality-prayer' }, marriage: { type: 'doctrine', id: 'sexuality-marriage' }, worship: { type: 'doctrine', id: 'worship-liturgy' },
  creation: { type: 'doctrine', id: 'creation-providence' }, evolution: { type: 'doctrine', id: 'creation-providence' }, sin: { type: 'doctrine', id: 'humanity-sin' },
  angels: { type: 'doctrine', id: 'angels-spiritual-powers' }, demons: { type: 'doctrine', id: 'angels-spiritual-powers' }, mission: { type: 'doctrine', id: 'mission-religions' },
  'great schism': { type: 'event', id: 'great-schism-1054' }, reformation: { type: 'era', id: 'reformations' },
  ethiopia: { type: 'event', id: 'conversion-of-ethiopia-aksum-330' }, armenia: { type: 'event', id: 'conversion-of-armenia-301' },
  china: { type: 'event', id: 'alopen-reaches-chang-an-635' }, russia: { type: 'event', id: 'baptism-of-rus-988' }, rus: { type: 'event', id: 'baptism-of-rus-988' },
};

// Which part of a tradition's profile answers a question about a doctrine.
const PROFILE_FOR: Record<string, keyof Tradition['profile']> = {
  salvation: 'salvation', atonement: 'salvation', 'church-sacraments': 'sacraments', baptism: 'sacraments', 'scripture-authority': 'authority',
  eschatology: 'eschatology', 'worship-liturgy': 'worship', 'holy-spirit': 'worship',
};
const PROFILE_WORDS: [RegExp, keyof Tradition['profile']][] = [
  [/\b(salvation|saved|grace|justif)/, 'salvation'], [/\b(sacrament|eucharist|communion|baptism|supper|mass)/, 'sacraments'],
  [/\b(authority|bible|scripture|pope|tradition)/, 'authority'], [/\b(end times|eschatolog|millenni|rapture|second coming)/, 'eschatology'],
  [/\b(govern|bishop|polity|leadership|organi[sz])/, 'governance'], [/\b(worship|liturg|music|service)/, 'worship'], [/\b(canon|books of the bible)/, 'canon'],
];

// ---------- entity recognition ----------

interface Alias { text: string; ref: Ref; weight: number }
let aliasCache: { atlas: Atlas; aliases: Alias[] } | undefined;

function variants(name: string, primary = true, allowIst = false, parenOk = false): string[] {
  const out = new Set<string>([name]);
  const noParen = name.replace(/\s*\([^)]*\)/g, '').trim();
  out.add(noParen);
  for (const part of noParen.split(/[:;,/–—]| and the | and /i)) if (part.trim().length > 3) out.add(part.trim());
  // A parenthesis on a main name is usually another name for it ("Salvation (Soteriology)");
  // on an alternative name it is often a place or qualifier, so it is skipped there.
  const paren = /\(([^)]+)\)/.exec(name)?.[1];
  if (primary && paren && (parenOk || paren.trim().split(/\s+/).length >= 2) && !/called|also|traditional|by opponents|eastern|western|strict|classic/i.test(paren)) out.add(paren);
  const core = noParen.replace(/^(the|saint|st\.?|pope|mar)\s+/i, '').replace(/\s+(church|churches|movement|communion|tradition)$/i, '').trim();
  out.add(core);
  if (/ of /i.test(core) && core.split(' ')[0].length > 3) out.add(core.split(/ of /i)[0]); // "Augustine of Hippo" → "Augustine"
  if (allowIst && /ism$/i.test(core)) out.add(core.replace(/ism$/i, 'ist'));
  const words = noParen.split(/\s+/);
  if (words.length >= 3 && !STOP.has(words[0].toLowerCase()) && !STOP.has(words[1].toLowerCase()) && (words[0] + words[1]).length >= 10) out.add(words.slice(0, 2).join(' '));
  return [...out].filter((v) => v.length >= 3);
}

function aliases(a: Atlas): Alias[] {
  if (aliasCache?.atlas === a) return aliasCache.aliases;
  const out: Alias[] = [];
  const add = (type: EntityType, id: string, names: string[], base: number) => {
    names.forEach((n, i) => { for (const v of variants(n, i === 0, type === 'tradition' || type === 'position', type === 'doctrine')) {
      // Drop leading little words so "On Baptism" competes with "Baptism" on type, not length.
      const text = norm(v).replace(/^ ((?:the|on|of|a|an|in|to|for) )+/, ' ');
      if (text.trim().length < 3 || STOP.has(text.trim())) continue;
      out.push({ text, ref: { type, id }, weight: base + text.length + (v === n ? 2 : 0) }); // exact names beat derived ones
    } });
  };
  for (const d of a.doctrines) add('doctrine', d.id, [d.name, d.id.replace(/-/g, ' ')], 6);
  for (const t of a.traditions) add('tradition', t.id, [t.name], 5);
  for (const p of a.people) {
    add('person', p.id, [p.name], 5);
    // Surnames ("Calvin", "Wesley"), skipping suffixes and very short or ambiguous endings.
    const last = p.name.replace(/\s*\([^)]*\)/g, '').replace(/,?\s+(jr\.?|sr\.?|i{1,3}|iv|the (great|younger|elder))$/i, '').trim().split(/\s+/).pop() ?? '';
    if (p.name.includes(' ') && last.length >= 5 && !/^(of|the)$/i.test(last)) out.push({ text: norm(last), ref: { type: 'person', id: p.id }, weight: 1 + last.length });
  }
  for (const p of a.positions) add('position', p.id, [p.name, ...p.altNames], 4);
  for (const e of a.events) add('event', e.id, [e.title], 3);
  for (const c of a.controversies) add('controversy', c.id, [c.title], 2);
  for (const x of a.experiences) add('experience', x.id, [x.title], 2);
  for (const w of a.works) add('work', w.id, [w.title], 2);
  for (const e of a.eras) add('era', e.id, [e.name, e.short], 1);
  for (const [k, ref] of Object.entries(ALIASES)) if (a.get(ref.type, ref.id)) out.push({ text: norm(k), ref, weight: 40 + k.length }); // everyday names win ties
  aliasCache = { atlas: a, aliases: out };
  return out;
}

/** Finds the entries a question names, longest match first, without overlapping matches. */
export function recognise(a: Atlas, question: string): { ref: Ref; at: number; len: number }[] {
  const q = norm(question);
  const hits: { ref: Ref; at: number; len: number; weight: number }[] = [];
  for (const al of aliases(a)) {
    const at = q.indexOf(al.text);
    if (at >= 0) hits.push({ ref: al.ref, at, len: al.text.length, weight: al.weight });
  }
  hits.sort((x, y) => y.len - x.len || y.weight - x.weight);
  const taken: { at: number; len: number }[] = [];
  const chosen: typeof hits = [];
  for (const h of hits) {
    if (taken.some((t) => h.at < t.at + t.len - 1 && t.at < h.at + h.len - 1)) continue;
    if (chosen.some((c) => c.ref.type === h.ref.type && c.ref.id === h.ref.id)) continue;
    taken.push(h);
    chosen.push(h);
  }
  return chosen.sort((x, y) => x.at - y.at);
}

// ---------- describing entries ----------

function name(a: Atlas, r: Ref): string {
  const e = a.get<Record<string, unknown>>(r.type, r.id);
  return (e?.name ?? e?.title ?? r.id) as string;
}
const L = (a: Atlas, r: Ref) => link(r.type, r.id, name(a, r));
const links = (a: Atlas, type: EntityType, ids: string[], n = 8) => ids.filter((id) => a.get(type, id)).slice(0, n).map((id) => L(a, { type, id }));

function lineageChain(a: Atlas, t: Tradition): Tradition[] {
  const chain: Tradition[] = [t];
  const seen = new Set([t.id]);
  let cur = t;
  while (cur.parentIds[0] && !seen.has(cur.parentIds[0])) {
    const p = a.get<Tradition>('tradition', cur.parentIds[0]);
    if (!p) break;
    seen.add(p.id);
    chain.unshift(p);
    cur = p;
  }
  return chain;
}

function describePerson(a: Atlas, p: Person, related: Ref[]): string {
  const works = a.worksByAuthor.get(p.id) ?? [];
  const quote = (a.quotesByPerson.get(p.id) ?? [])[0];
  related.push(...p.traditionIds.map((id) => ({ type: 'tradition' as const, id })), ...works.slice(0, 3).map((w) => ({ type: 'work' as const, id: w.id })));
  const parts = [
    `**${link('person', p.id, p.name)}** (${formatSpan(p.born, p.died, p.circa) || 'dates uncertain'})${p.roles.length ? ` — ${p.roles.slice(0, 3).join(', ')}` : ''}.`,
    p.summary,
  ];
  if (p.keyIdeas.length) parts.push(`Key ideas:\n${bullets(p.keyIdeas, 4)}`);
  const facts: string[] = [];
  if (p.traditionIds.length) facts.push(`Tradition: ${links(a, 'tradition', p.traditionIds).join(', ')}`);
  if (works.length) facts.push(`Writings: ${works.slice(0, 4).map((w) => link('work', w.id, w.title)).join(', ')}`);
  if (p.influencedBy.length) facts.push(`Influenced by: ${links(a, 'person', p.influencedBy, 5).join(', ')}`);
  const inf = a.influenced.get(p.id) ?? [];
  if (inf.length) facts.push(`Influenced: ${inf.slice(0, 5).map((x) => link('person', x.id, x.name)).join(', ')}`);
  if (facts.length) parts.push(bullets(facts, 5));
  if (quote) parts.push(quoteLine(a, quote));
  return parts.join('\n\n');
}

function quoteLine(_a: Atlas, q: Quote) {
  return q.kind === 'quotation' ? `> “${clip(q.text, 300)}” — *${q.citation}*` : `> ${clip(q.text, 300)} *(paraphrase; ${q.citation})*`;
}

function describeTradition(a: Atlas, t: Tradition, related: Ref[], focusField?: keyof Tradition['profile']): string {
  const f = FAMILIES[t.family];
  const chain = lineageChain(a, t);
  const split = t.splitEventId ? a.get<Event>('event', t.splitEventId) : undefined;
  const kids = a.childrenOf.get(t.id) ?? [];
  related.push(...(split ? [{ type: 'event' as const, id: split.id }] : []), ...kids.slice(0, 4).map((k) => ({ type: 'tradition' as const, id: k.id })));
  const parts = [
    `**${link('tradition', t.id, t.name)}** — ${f.label} family, emerging ${formatYear(t.foundedYear)}${t.endYear ? ` and ending ${formatYear(t.endYear)}` : ''}.${t.adherents ? ` About ${Math.round(t.adherents.estimate / 1e6).toLocaleString()} million adherents (${t.adherents.year}).` : ''}`,
    t.summary,
  ];
  if (t.family === 'nontrinitarian') parts.push('*It stands outside the historic Nicene (Trinitarian) consensus shared by Catholic, Orthodox and most Protestant churches; it is described here in its own terms.*');
  if (focusField) parts.push(`**${cap(focusField)}:** ${t.profile[focusField]}`);
  else parts.push(`Distinctives:\n${bullets(t.distinctives, 5)}`);
  if (chain.length > 1) parts.push(`Lineage: ${chain.map((c) => link('tradition', c.id, c.name)).join(' → ')}`);
  if (split) parts.push(`Founding moment: ${link('event', split.id, split.title)} (${formatYear(split.year, split.circa)}).`);
  if (kids.length) parts.push(`Branches: ${kids.slice(0, 8).map((k) => link('tradition', k.id, k.name)).join(', ')}${kids.length > 8 ? ` and ${kids.length - 8} more` : ''}.`);
  return parts.join('\n\n');
}

function describeDoctrine(a: Atlas, d: Doctrine, related: Ref[]): string {
  const ps = a.positionsByDoctrine.get(d.id) ?? [];
  const debates = a.controversiesByDoctrine.get(d.id) ?? [];
  related.push(...debates.slice(0, 3).map((c) => ({ type: 'controversy' as const, id: c.id })));
  const order = ['majority', 'significant', 'minority', 'historic', 'rejected-by-councils'];
  const label: Record<string, string> = { majority: 'Majority views', significant: 'Significant views', minority: 'Minority views', historic: 'Historic views', 'rejected-by-councils': 'Rejected by councils' };
  const groups = order.map((s) => [s, ps.filter((p) => p.standing === s)] as const).filter(([, g]) => g.length);
  return [
    `**${link('doctrine', d.id, d.name)}** asks: *${d.question}*`,
    d.summary,
    ...groups.map(([s, g]) => `**${label[s]}**\n${g.slice(0, 7).map((p) => `- ${link('position', p.id, p.name)} — ${clip(p.oneLine, 160)}`).join('\n')}${g.length > 7 ? `\n- …and ${g.length - 7} more` : ''}`),
    debates.length ? `Debates: ${debates.map((c) => link('controversy', c.id, c.title)).join(', ')}.` : '',
  ].filter(Boolean).join('\n\n');
}

function describePosition(a: Atlas, p: Position, related: Ref[], mode: 'full' | 'arguments' = 'full'): string {
  const d = a.doctrinesByPosition.get(p.id);
  related.push(...p.relatedPositionIds.slice(0, 3).map((id) => ({ type: 'position' as const, id })));
  const parts = [
    `**${link('position', p.id, p.name)}**${d ? ` (a view within ${link('doctrine', d.id, d.name)})` : ''}${p.originYear !== undefined ? `, from about ${formatYear(p.originYear)}` : ''}: ${p.oneLine}`,
  ];
  if (mode === 'full') parts.push(`What its adherents hold:\n${bullets(p.coreClaims, 4)}`);
  parts.push(`Its strongest arguments, in its own terms:\n${bullets(p.strongestArguments, mode === 'full' ? 3 : 5)}`);
  parts.push(`The strongest objections from other traditions:\n${bullets(p.strongestObjections, mode === 'full' ? 3 : 5)}`);
  if (p.responses.length) parts.push(`How adherents respond:\n${bullets(p.responses, 3)}`);
  const who: string[] = [];
  if (p.traditionIds.length) who.push(`Held by: ${links(a, 'tradition', p.traditionIds, 6).join(', ')}`);
  if (p.proponentIds.length) who.push(`Proponents: ${links(a, 'person', p.proponentIds, 6).join(', ')}`);
  if (p.keyTexts.length && mode === 'full') who.push(`Key texts: ${p.keyTexts.slice(0, 5).join('; ')}`);
  if (who.length) parts.push(bullets(who, 3));
  return parts.join('\n\n');
}

function describeEvent(a: Atlas, e: Event, related: Ref[], mode: 'full' | 'why' | 'when' = 'full'): string {
  const founded = a.traditions.filter((t) => t.splitEventId === e.id);
  related.push(...e.peopleIds.slice(0, 3).map((id) => ({ type: 'person' as const, id })), ...founded.map((t) => ({ type: 'tradition' as const, id: t.id })));
  const head = `**${link('event', e.id, e.title)}** — ${formatSpan(e.year, e.endYear, e.circa)}${e.place ? `, ${e.place.name}` : ''}.`;
  if (mode === 'when') return [head, clip(e.summary, 400)].join('\n\n');
  const parts = [head];
  if (mode === 'full') parts.push(e.longText ? clip(e.longText.split(/\n\n/)[0], 700) : e.summary);
  if (e.causes.length) parts.push(`${mode === 'why' ? 'Why it happened' : 'Causes'}:\n${bullets(e.causes, 5)}`);
  if (e.consequences.length) parts.push(`What followed:\n${bullets(e.consequences, 4)}`);
  if (founded.length) parts.push(`Traditions that emerged from it: ${founded.map((t) => link('tradition', t.id, t.name)).join(', ')}.`);
  if (e.peopleIds.length) parts.push(`People involved: ${links(a, 'person', e.peopleIds, 6).join(', ')}.`);
  if (e.confidence !== 'established') parts.push(`*Confidence: ${e.confidence === 'debated' ? 'historians debate parts of this account' : 'this rests mainly on tradition or legend'}.*`);
  return parts.join('\n\n');
}

function describeControversy(a: Atlas, c: Controversy): string {
  return [
    `**${link('controversy', c.id, c.title)}** — *${c.question}*`,
    c.summary,
    ...c.sides.map((s) => `**${s.positionId && a.get('position', s.positionId) ? link('position', s.positionId, s.name) : s.name}** in its own voice: ${clip(s.steelman, 360)}`),
    `**Outcome (${c.resolution.kind}):** ${c.resolution.text}`,
  ].join('\n\n');
}

function describeExperience(_a: Atlas, x: Experience): string {
  const conf = { 'well-documented': 'well documented', contested: 'contested', hagiographical: 'known mainly from later devotional accounts' }[x.confidence];
  return [
    `**${link('experience', x.id, x.title)}** — ${formatSpan(x.year, x.endYear, x.circa)}, ${x.place.name} (${conf}).`,
    x.account,
    `How contemporaries saw it: ${x.contemporaryInterpretation}`,
    `How it is assessed today:\n${x.assessments.slice(0, 4).map((s) => `- **${s.perspective}:** ${clip(s.text, 220)}`).join('\n')}`,
  ].join('\n\n');
}

function describeWork(a: Atlas, w: Work): string {
  const q = (a.quotesByWork.get(w.id) ?? [])[0];
  return [
    `**${link('work', w.id, w.title)}** — ${w.genre}, ${formatYear(w.year, w.circa)}, by ${w.authorId && a.get('person', w.authorId) ? L(a, { type: 'person', id: w.authorId }) : w.author ?? 'an unknown author'}.`,
    w.summary,
    `Why it matters: ${w.significance}`,
    q ? quoteLine(a, q) : '',
    w.fullTextUrl ? `Full text: [read it online](${w.fullTextUrl})` : '',
  ].filter(Boolean).join('\n\n');
}

function describeEra(a: Atlas, e: Era): string {
  const evs = a.eventsByEra.get(e.id) ?? [];
  return [
    `**${link('era', e.id, e.name)}** (${formatYear(e.startYear)}–${e.endYear >= 2026 ? 'today' : formatYear(e.endYear)})`,
    e.summary,
    `Key themes: ${e.keyThemes.join('; ')}.`,
    evs.length ? `Key events:\n${evs.slice(0, 8).map((x) => `- ${formatYear(x.year, x.circa)}: ${link('event', x.id, x.title)}`).join('\n')}` : '',
    e.globalNotes.length ? `Beyond the West:\n${e.globalNotes.slice(0, 3).map((n) => `- ${clip(n.text, 200)}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

function describe(a: Atlas, r: Ref, related: Ref[]): string {
  switch (r.type) {
    case 'person': return describePerson(a, a.get<Person>('person', r.id)!, related);
    case 'tradition': return describeTradition(a, a.get<Tradition>('tradition', r.id)!, related);
    case 'doctrine': return describeDoctrine(a, a.get<Doctrine>('doctrine', r.id)!, related);
    case 'position': return describePosition(a, a.get<Position>('position', r.id)!, related);
    case 'event': return describeEvent(a, a.get<Event>('event', r.id)!, related);
    case 'controversy': return describeControversy(a, a.get<Controversy>('controversy', r.id)!);
    case 'experience': return describeExperience(a, a.get<Experience>('experience', r.id)!);
    case 'work': return describeWork(a, a.get<Work>('work', r.id)!);
    case 'era': return describeEra(a, a.get<Era>('era', r.id)!);
    case 'comparison': { const c = a.get<Comparison>('comparison', r.id)!; return `**${link('comparison', c.id, c.title)}**\n\n${c.summary}`; }
    case 'path': { const p = a.get<StudyPath>('path', r.id)!; return `**${link('path', p.id, p.title)}** — a ${p.steps.length}-step guided path.\n\n${p.summary}`; }
    case 'quote': { const q = a.get<Quote>('quote', r.id)!; return quoteLine(a, q); }
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- intents ----------

function compare(a: Atlas, x: Ref, y: Ref, related: Ref[]): string {
  if (x.type === 'position' && y.type === 'position') {
    const p = a.get<Position>('position', x.id)!, q = a.get<Position>('position', y.id)!;
    return [
      `Comparing ${L(a, x)} and ${L(a, y)}:`,
      `**In one line**\n- ${p.name}: ${p.oneLine}\n- ${q.name}: ${q.oneLine}`,
      `**Core claims**\n- ${p.name}: ${p.coreClaims.slice(0, 2).join(' ')}\n- ${q.name}: ${q.coreClaims.slice(0, 2).join(' ')}`,
      `**Main argument for each**\n- ${p.name}: ${p.strongestArguments[0] ?? '—'}\n- ${q.name}: ${q.strongestArguments[0] ?? '—'}`,
      `**Main objection to each**\n- ${p.name}: ${p.strongestObjections[0] ?? '—'}\n- ${q.name}: ${q.strongestObjections[0] ?? '—'}`,
      `**Held by**\n- ${p.name}: ${links(a, 'tradition', p.traditionIds, 5).join(', ') || '—'}\n- ${q.name}: ${links(a, 'tradition', q.traditionIds, 5).join(', ') || '—'}`,
    ].join('\n\n');
  }
  if (x.type === 'tradition' && y.type === 'tradition') {
    const s = a.get<Tradition>('tradition', x.id)!, t = a.get<Tradition>('tradition', y.id)!;
    const rows = (Object.keys(s.profile) as (keyof Tradition['profile'])[]).map((k) => `**${cap(k)}**\n- ${s.name}: ${s.profile[k]}\n- ${t.name}: ${t.profile[k]}`);
    const cs = lineageChain(a, s).map((c) => c.id), ct = new Set(lineageChain(a, t).map((c) => c.id));
    const common = [...cs].reverse().find((id) => ct.has(id));
    return [
      `Comparing ${L(a, x)} and ${L(a, y)}:`,
      common ? `Both descend from ${L(a, { type: 'tradition', id: common })}${common !== s.id && common !== t.id ? ', where their lines part' : ''}.` : '',
      ...rows,
    ].filter(Boolean).join('\n\n');
  }
  related.push(x, y);
  return [describe(a, x, related), '---', describe(a, y, related)].join('\n\n');
}

function beliefs(a: Atlas, t: Tradition, topic: Ref | undefined, question: string, related: Ref[]): string {
  const field = (topic && PROFILE_FOR[topic.id]) ?? PROFILE_WORDS.find(([re]) => re.test(question.toLowerCase()))?.[1];
  const parts = [`**${link('tradition', t.id, t.name)}**`];
  if (field) parts.push(`**${cap(field)}:** ${t.profile[field]}`);
  if (topic?.type === 'doctrine') {
    // Positions this tradition holds, or failing that, those its parent traditions hold.
    const chain = lineageChain(a, t).reverse();
    for (const anc of chain) {
      const ps = (a.positionsByDoctrine.get(topic.id) ?? []).filter((p) => p.traditionIds.includes(anc.id));
      if (ps.length) {
        parts.push(`${anc.id === t.id ? 'Positions it holds' : `Positions held in its parent tradition, ${link('tradition', anc.id, anc.name)}`} on ${L(a, topic)}:\n${ps.slice(0, 6).map((p) => `- ${link('position', p.id, p.name)} — ${clip(p.oneLine, 170)}`).join('\n')}`);
        break;
      }
    }
  }
  if (parts.length === 1) return describeTradition(a, t, related);
  parts.push(`Distinctives:\n${bullets(t.distinctives, 3)}`);
  return parts.join('\n\n');
}

function yearsIn(q: string): [number, number] | null {
  const s = q.toLowerCase();
  const cent = /(\d{1,2})(?:st|nd|rd|th)\s+century/.exec(s);
  if (cent) { const c = +cent[1]; return [(c - 1) * 100, c * 100 - 1]; }
  const decade = /\b(1\d|20)(\d)0s\b/.exec(s);
  if (decade) { const y = +(decade[1] + decade[2] + '0'); return [y, y + 9]; }
  const hundreds = /\b(\d{1,2})00s\b/.exec(s);
  if (hundreds) { const y = +hundreds[1] * 100; return [y, y + 99]; }
  const range = /\b(\d{2,4})\s*(?:-|–|to|and|until)\s*(\d{2,4})\b/.exec(s);
  if (range && /between|from|during|\d\s*[-–]\s*\d/.test(s)) return [+range[1], +range[2]];
  const single = /\b(?:in|year|around|about|c\.?)\s+(?:ad\s+)?(\d{2,4})\b/.exec(s) ?? /\b(\d{3,4})\b/.exec(s);
  if (single) { const y = +single[1]; return [y - 5, y + 5]; }
  return null;
}

function timeline(a: Atlas, [from, to]: [number, number]): string {
  const evs = a.events.filter((e) => e.year >= from && e.year <= to);
  const era = a.eraOf(Math.round((from + to) / 2));
  if (!evs.length) return `The atlas has no events recorded between ${formatYear(from)} and ${formatYear(to)}.${era ? ` That period falls in ${link('era', era.id, era.name)}.` : ''}`;
  return [
    `Between ${formatYear(Math.max(from, 0) || from)} and ${formatYear(to)}${era ? `, during ${link('era', era.id, era.name)}` : ''}, the atlas records:`,
    evs.slice(0, 14).map((e) => `- **${formatYear(e.year, e.circa)}** — ${link('event', e.id, e.title)}: ${clip(e.summary, 140)}`).join('\n'),
    evs.length > 14 ? `…and ${evs.length - 14} more on the [timeline](entity:era/${era?.id ?? 'contemporary'}).` : '',
  ].filter(Boolean).join('\n\n');
}

const HELP = `I'm the offline Atlas Guide. I answer from the atlas's own entries, right here in your browser, with no internet or AI service. Try questions like:

- **Who was** Athanasius? · **What is** theosis?
- **Why did** the Great Schism happen? · **When was** the Council of Chalcedon?
- **Trace** the Assemblies of God back to the early church
- **Compare** penal substitution **and** Christus Victor · **Compare** Lutheran **and** Reformed
- **What do** Methodists **believe about** salvation?
- **What are the views on** baptism? · **Arguments for and against** cessationism
- **What happened** in the 4th century? · between 1500 and 1550?

Ask a follow-up such as "what did he write?" or "what came from it?" and I'll keep the same subject.`;

/** Answers one question from the atlas. `focus` carries the subject of the previous answer for follow-ups. */
export function answerOffline(a: Atlas, question: string, focus?: Ref): OfflineAnswer {
  const steps: string[] = [];
  const related: Ref[] = [];
  const q = question.trim();
  const ql = ' ' + q.toLowerCase().replace(/[?!.]/g, ' ') + ' ';
  if (!q || /^\s*(help|hi|hello|hey|what can you do|how do i use)/i.test(q)) return { text: HELP, steps, related };

  let found = recognise(a, q).map((h) => h.ref);
  if (found.length) steps.push(`Recognised ${found.slice(0, 4).map((r) => name(a, r)).join(', ')}`);

  // Follow-ups: "what did he write", "what came of it" keep the previous subject.
  const followUp = /\b(he|she|him|her|his|its|it|they|them|their|this|that)\b/.test(ql) && found.length === 0;
  if (!found.length && followUp && focus && a.get(focus.type, focus.id)) {
    found = [focus];
    steps.push(`Following up on ${name(a, focus)}`);
  }

  const years = yearsIn(q);
  const wantsTimeline = /\b(what happened|events|timeline|happen(ed)? in|during the|century|centuries)\b/.test(ql) || (years && !found.some((f) => f.type !== 'era'));
  if (wantsTimeline && years) {
    steps.push(`Checked the timeline ${formatYear(years[0])}–${formatYear(years[1])}`);
    return { text: timeline(a, years), steps, related };
  }

  if (!found.length) {
    const hits = getFuse(a).search(q, { limit: 6 }).map((r) => r.item);
    steps.push(`Searched the atlas for “${clip(q, 50)}”`);
    if (!hits.length) return { text: `I couldn't find anything in the atlas for that. Try naming a person, council, doctrine, church or year — or type **help** for examples.`, steps, related };
    const top = { type: hits[0].type, id: hits[0].id };
    const rest = hits.slice(1).map((h) => `- ${link(h.type, h.id, h.title)} — ${clip(h.text, 120)}`);
    return {
      text: `${describe(a, top, related)}\n\n**Other entries that may help**\n${rest.join('\n')}`,
      steps, focus: top, related,
    };
  }

  const [x, y] = found;
  const of = <T extends EntityType>(t: T) => found.find((f) => f.type === t);

  // Compare two things.
  if (y && /\b(compare|comparison|difference|differ|versus|vs|contrast|similar)\b/.test(ql)) {
    steps.push(`Compared ${name(a, x)} with ${name(a, y)}`);
    return { text: compare(a, x, y, related), steps, focus: x, related };
  }

  // Lineage and origins of a church.
  const trad = of('tradition');
  if (trad && /\b(trace|lineage|origin|origins|come from|came from|descend|descended|roots|family tree|split|separate|separated|branch|ancestors|founded|begin|began|start|started)\b/.test(ql)) {
    const t = a.get<Tradition>('tradition', trad.id)!;
    const chain = lineageChain(a, t);
    steps.push(`Traced the lineage of ${t.name}`);
    const splits = chain.map((c) => (c.splitEventId ? a.get<Event>('event', c.splitEventId) : undefined)).filter(Boolean) as Event[];
    const text = [
      `**${link('tradition', t.id, t.name)}** goes back through ${chain.length - 1} generation${chain.length === 2 ? '' : 's'} of the family tree:`,
      chain.map((c, i) => `${i + 1}. ${link('tradition', c.id, c.name)} — from ${formatYear(c.foundedYear)}${c.splitEventId && a.get('event', c.splitEventId) ? ` (${L(a, { type: 'event', id: c.splitEventId })})` : ''}`).join('\n'),
      t.parentIds.length > 1 ? `It also draws on ${links(a, 'tradition', t.parentIds.slice(1)).join(', ')}.` : '',
      ...splits.slice(-2).map((e) => `**Behind ${link('event', e.id, e.title)} (${formatYear(e.year, e.circa)}):**\n${bullets(e.causes, 3)}`),
      t.summary,
    ].filter(Boolean).join('\n\n');
    return { text, steps, focus: trad, related };
  }

  // What a church believes about a topic.
  if (trad && /\b(believe|believes|belief|beliefs|teach|teaches|teaching|view|views|hold|holds|say|says|think|position|stance|understand)\b/.test(ql)) {
    const topic = found.find((f) => f.type === 'doctrine');
    steps.push(`Read what ${name(a, trad)} holds${topic ? ` on ${name(a, topic)}` : ''}`);
    return { text: beliefs(a, a.get<Tradition>('tradition', trad.id)!, topic, q, related), steps, focus: trad, related };
  }

  // What a person taught about a doctrine.
  const who = of('person');
  const topicDoc = of('doctrine');
  if (who && topicDoc && /\b(teach|taught|believe|believed|think|thought|say|said|view|views|hold|held|about|on)\b/.test(ql)) {
    const p = a.get<Person>('person', who.id)!;
    // Put first the positions that mention the question's own words (e.g. "predestination").
    const words = ql.split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w));
    const score = (x: Position) => words.filter((w) => (x.name + ' ' + x.oneLine + ' ' + x.coreClaims.join(' ')).toLowerCase().includes(w)).length;
    const ps = (a.positionsByDoctrine.get(topicDoc.id) ?? []).filter((x) => x.proponentIds.includes(p.id)).sort((x, y) => score(y) - score(x));
    steps.push(`Read what ${p.name} taught on ${name(a, topicDoc)}`);
    if (ps.length) {
      return {
        text: [
          `**${link('person', p.id, p.name)}** is listed as a proponent of ${ps.length === 1 ? 'this position' : 'these positions'} on ${L(a, topicDoc)}:`,
          ...ps.slice(0, 3).map((x) => `**${link('position', x.id, x.name)}** — ${x.oneLine}

${bullets(x.coreClaims, 3)}`),
          ((a.quotesByPerson.get(p.id) ?? []).find((qq) => qq.doctrineIds.includes(topicDoc.id)) ?? null) ? quoteLine(a, (a.quotesByPerson.get(p.id) ?? []).find((qq) => qq.doctrineIds.includes(topicDoc.id))!) : '',
        ].filter(Boolean).join('\n\n'),
        steps, focus: who, related,
      };
    }
  }

  // Arguments for / against a position.
  const pos = of('position');
  if (pos && /\b(argument|arguments|for and against|case for|case against|objection|objections|criticism|critique|defend|support|evidence|pros|cons)\b/.test(ql)) {
    steps.push(`Read the arguments for and against ${name(a, pos)}`);
    return { text: describePosition(a, a.get<Position>('position', pos.id)!, related, 'arguments'), steps, focus: pos, related };
  }

  // Views on a doctrine.
  const doc = of('doctrine');
  if (doc && !pos && (x.type === 'doctrine' || /\b(views|positions|theories|schools|options|beliefs|perspectives|opinions)\b/.test(ql))) {
    steps.push(`Listed the positions on ${name(a, doc)}`);
    return { text: describeDoctrine(a, a.get<Doctrine>('doctrine', doc.id)!, related), steps, focus: doc, related };
  }

  // Why / when about an event.
  const ev = of('event');
  if (ev && /\b(why|cause|caused|reason|reasons|led to|lead to|result|results|consequence|consequences|effect)\b/.test(ql)) {
    steps.push(`Read the causes and consequences of ${name(a, ev)}`);
    return { text: describeEvent(a, a.get<Event>('event', ev.id)!, related, 'why'), steps, focus: ev, related };
  }
  if (/\bwhen\b/.test(ql)) {
    const r = ev ?? x;
    steps.push(`Looked up the date of ${name(a, r)}`);
    if (r.type === 'event') return { text: describeEvent(a, a.get<Event>('event', r.id)!, related, 'when'), steps, focus: r, related };
    if (r.type === 'person') { const p = a.get<Person>('person', r.id)!; return { text: `${link('person', p.id, p.name)} lived ${formatSpan(p.born, p.died, p.circa) || '(dates uncertain)'}.\n\n${p.summary}`, steps, focus: r, related }; }
    if (r.type === 'tradition') { const t = a.get<Tradition>('tradition', r.id)!; return { text: `${link('tradition', t.id, t.name)} emerged in ${formatYear(t.foundedYear)}${t.splitEventId && a.get('event', t.splitEventId) ? ` (${L(a, { type: 'event', id: t.splitEventId })})` : ''}.\n\n${t.summary}`, steps, focus: r, related }; }
  }

  // Follow-up questions about a person's writings or quotes.
  const per = of('person');
  if (per && /\b(write|wrote|writings|works|books|said|say|quote|quotes|words)\b/.test(ql)) {
    const p = a.get<Person>('person', per.id)!;
    const works = a.worksByAuthor.get(p.id) ?? [];
    const quotes = a.quotesByPerson.get(p.id) ?? [];
    steps.push(`Read the writings and quotations of ${p.name}`);
    return {
      text: [
        `**${link('person', p.id, p.name)}**`,
        works.length ? `Writings in the atlas:\n${works.map((w) => `- ${link('work', w.id, w.title)} (${formatYear(w.year, w.circa)}) — ${clip(w.summary, 140)}`).join('\n')}` : 'The atlas has no writings recorded for this person yet.',
        quotes.length ? `In their words:\n\n${quotes.slice(0, 3).map((qq) => quoteLine(a, qq)).join('\n\n')}` : '',
      ].filter(Boolean).join('\n\n'),
      steps, focus: per, related,
    };
  }

  // Default: describe what was named (the first two, if two different things were named).
  steps.push(`Read the entry for ${name(a, x)}`);
  const text = y && y.type !== x.type ? `${describe(a, x, related)}\n\n---\n\n${describe(a, y, related)}` : describe(a, x, related);
  return { text, steps, focus: x, related };
}
