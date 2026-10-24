/**
 * The offline Atlas Guide: answers questions entirely in the browser (or in Node) from the atlas data,
 * with no AI service, API key or network. It recognises the entries a question names, works out what
 * kind of question it is (who / when / why / compare / lineage / beliefs / views / arguments / timeline),
 * and writes the answer from the entries' own sourced fields, linking every entry it uses.
 */
import type { Atlas } from '../data/db';
import type {
  Controversy, Doctrine, EntityType, Era, Event, Experience, Person, Position, Quote, Tradition, Work, Comparison, StudyPath, MissionMovement, IndiaMission, Conflict, ChurchFather, PaganInfluence,
} from '../data/schema';
import { FAMILIES, formatSpan, formatYear } from '../data/families';
import { getFuse } from '../data/searchIndex';
import { isTA, t, ui } from '../i18n/dict';
import { englishNames } from '../data/db';

export interface Ref { type: EntityType; id: string }
export interface OfflineAnswer { text: string; steps: string[]; focus?: Ref; related: Ref[] }

// ---------- text helpers ----------

/** Lower-cases, strips accents and punctuation, and lightly stems ("substitutionary" ≈ "substitution", plurals). */
const norm = (s: string) =>
  ' ' +
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9\u0B80-\u0BFF]+/g, ' ').trim()
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

// Everyday Tamil words for common subjects (the Tamil edition).
const ALIASES_TA: Record<string, Ref> = {
  'கத்தோலிக்க': { type: 'tradition', id: 'catholic' }, 'ஆர்த்தடாக்ஸ்': { type: 'tradition', id: 'eastern-orthodox' }, 'புராட்டஸ்டன்ட்': { type: 'tradition', id: 'lutheran' },
  'லூத்தரன்': { type: 'tradition', id: 'lutheran' }, 'சீர்திருத்தச் சபை': { type: 'tradition', id: 'reformed' }, 'ஆங்கிலிக்கன்': { type: 'tradition', id: 'anglican' },
  'மெதடிஸ்ட்': { type: 'tradition', id: 'methodist' }, 'பாப்டிஸ்ட்': { type: 'tradition', id: 'baptist' }, 'பெந்தெகொஸ்தே': { type: 'tradition', id: 'pentecostal' },
  'குவேக்கர்': { type: 'tradition', id: 'quaker' }, 'மார்மன்': { type: 'tradition', id: 'latter-day-saints' }, 'அட்வென்டிஸ்ட்': { type: 'tradition', id: 'seventh-day-adventist' },
  'கடைசிக் காலம்': { type: 'doctrine', id: 'eschatology' }, 'இரண்டாம் வருகை': { type: 'doctrine', id: 'eschatology' }, 'ஆயிரவருட': { type: 'doctrine', id: 'eschatology' },
  'எடுத்துக்கொள்ளப்படுதல்': { type: 'doctrine', id: 'eschatology' }, 'பரலோகம்': { type: 'doctrine', id: 'eschatology' }, 'நரகம்': { type: 'doctrine', id: 'salvation' },
  'போப்': { type: 'position', id: 'papal-infallibility' }, 'திருத்தந்தை': { type: 'position', id: 'papal-infallibility' },
  'கிருபை': { type: 'doctrine', id: 'salvation' }, 'இரட்சிப்பு': { type: 'doctrine', id: 'salvation' }, 'நீதிமானாக்க': { type: 'doctrine', id: 'salvation' }, 'முன்குறிப்பு': { type: 'doctrine', id: 'salvation' },
  'சிலுவை': { type: 'doctrine', id: 'atonement' }, 'பாவநிவர்த்தி': { type: 'doctrine', id: 'atonement' }, 'நற்கருணை': { type: 'doctrine', id: 'church-sacraments' }, 'திருவிருந்து': { type: 'doctrine', id: 'church-sacraments' },
  'திருவருட்சாதன': { type: 'doctrine', id: 'church-sacraments' }, 'ஞானஸ்நான': { type: 'doctrine', id: 'baptism' }, 'திருமுழுக்கு': { type: 'doctrine', id: 'baptism' },
  'வேதாகம': { type: 'doctrine', id: 'scripture-authority' }, 'பைபிள்': { type: 'doctrine', id: 'scripture-authority' }, 'மரியாள்': { type: 'doctrine', id: 'mary-saints' }, 'மரியா': { type: 'doctrine', id: 'mary-saints' },
  'புனிதர்': { type: 'doctrine', id: 'mary-saints' }, 'பரிசுத்த ஆவி': { type: 'doctrine', id: 'holy-spirit' }, 'அந்நியபாஷை': { type: 'doctrine', id: 'holy-spirit' }, 'ஆவிக்குரிய வரங்கள்': { type: 'doctrine', id: 'holy-spirit' },
  'இயேசு': { type: 'doctrine', id: 'christology' }, 'கிறிஸ்து': { type: 'doctrine', id: 'christology' }, 'திரித்துவ': { type: 'doctrine', id: 'trinity' }, 'கடவுள்': { type: 'doctrine', id: 'trinity' },
  'ஜெபம்': { type: 'doctrine', id: 'spirituality-prayer' }, 'பிரார்த்தனை': { type: 'doctrine', id: 'spirituality-prayer' }, 'திருமண': { type: 'doctrine', id: 'sexuality-marriage' }, 'வழிபாடு': { type: 'doctrine', id: 'worship-liturgy' },
  'படைப்பு': { type: 'doctrine', id: 'creation-providence' }, 'பரிணாம': { type: 'doctrine', id: 'creation-providence' }, 'பாவம்': { type: 'doctrine', id: 'humanity-sin' }, 'தேவதூத': { type: 'doctrine', id: 'angels-spiritual-powers' },
  'பிசாசு': { type: 'doctrine', id: 'angels-spiritual-powers' }, 'மிஷன்': { type: 'doctrine', id: 'mission-religions' }, 'பெரும் பிளவு': { type: 'event', id: 'great-schism-1054' }, 'சீர்திருத்தம்': { type: 'era', id: 'reformations' },
  'எத்தியோப்பியா': { type: 'event', id: 'conversion-of-ethiopia-aksum-330' }, 'ஆர்மீனியா': { type: 'event', id: 'conversion-of-armenia-301' }, 'சீனா': { type: 'event', id: 'alopen-reaches-chang-an-635' }, 'ரஷ்யா': { type: 'event', id: 'baptism-of-rus-988' },
  'இந்தியா': { type: 'tradition', id: 'saint-thomas-christians' }, 'தோமா': { type: 'tradition', id: 'saint-thomas-christians' },
};

/** Tamil stem for matching: drops the final word's last consonant or vowel sign so case endings still match. */
function taStem(text: string) {
  const words = text.trim().split(' ');
  const last = words.pop()!;
  const cut = last.replace(/[\u0B95-\u0BB9]\u0BCD$/, '').replace(/[\u0BBE-\u0BCC]$/, '');
  // Very short stems would match unrelated words, so they keep their word boundary instead.
  return cut.length >= 4 ? ' ' + [...words, cut].join(' ') : ' ' + [...words, last].join(' ') + ' ';
}

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
  for (const x of a.experiences) add('experience', x.id, [x.title], 6); // the full story beats the shorter event entry of the same name
  for (const w of a.works) add('work', w.id, [w.title], 2);
  for (const e of a.eras) add('era', e.id, [e.name, e.short], 1);
  for (const m of a.missions) add('mission', m.id, [m.name], 5);
  for (const m of a.indiaMissions) add('india', m.id, [m.title], 5);
  for (const c of a.conflicts) add('conflict', c.id, [c.name], 6);
  for (const f of a.fathers) add('father', f.id, [f.name], 4);
  for (const p of a.influences) add('influence', p.id, [p.name], 6);
  for (const [k, ref] of Object.entries(ALIASES)) if (a.get(ref.type, ref.id)) out.push({ text: norm(k), ref, weight: 40 + k.length }); // everyday names win ties
  if (isTA()) {
    // The Tamil edition also understands English names, and everyday Tamil words for common subjects.
    for (const [key, n] of Object.entries(englishNames())) {
      const [type, id] = key.split('/') as [EntityType, string];
      if (n && a.get(type, id)) for (const v of variants(n, true, type === 'tradition' || type === 'position', type === 'doctrine')) {
        const text = norm(v).replace(/^ ((?:the|on|of|a|an|in|to|for) )+/, ' ');
        if (text.trim().length >= 3 && !STOP.has(text.trim())) out.push({ text, ref: { type, id }, weight: text.length });
      }
    }
    for (const [k, ref] of Object.entries(ALIASES_TA)) if (a.get(ref.type, ref.id)) out.push({ text: norm(k), ref, weight: 40 + k.length });
    // Tamil words take case endings ("திரித்துவம்" → "திரித்துவத்தை"), so Tamil names match by their stem.
    for (const al of out) if (/[\u0B80-\u0BFF]/.test(al.text)) al.text = taStem(al.text.replace(/ (பற்றி|குறித்து|பற்றிய) $/, ' '));
  }
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
    `**${link('person', p.id, p.name)}** (${formatSpan(p.born, p.died, p.circa) || t('dates uncertain', 'காலம் உறுதியில்லை')})${p.roles.length ? ` — ${p.roles.slice(0, 3).join(', ')}` : ''}.`,
    p.summary,
  ];
  if (p.keyIdeas.length) parts.push(`${t('Key ideas', 'முக்கியக் கருத்துகள்')}:\n${bullets(p.keyIdeas, 4)}`);
  const facts: string[] = [];
  if (p.traditionIds.length) facts.push(`${t('Tradition', 'மரபு')}: ${links(a, 'tradition', p.traditionIds).join(', ')}`);
  if (works.length) facts.push(`${t('Writings', 'எழுத்துகள்')}: ${works.slice(0, 4).map((w) => link('work', w.id, w.title)).join(', ')}`);
  if (p.influencedBy.length) facts.push(`${t('Influenced by', 'இவர்மீது தாக்கம் செலுத்தியோர்')}: ${links(a, 'person', p.influencedBy, 5).join(', ')}`);
  const inf = a.influenced.get(p.id) ?? [];
  if (inf.length) facts.push(`${t('Influenced', 'இவரால் தாக்கம் பெற்றோர்')}: ${inf.slice(0, 5).map((x) => link('person', x.id, x.name)).join(', ')}`);
  if (facts.length) parts.push(bullets(facts, 5));
  if (quote) parts.push(quoteLine(a, quote));
  return parts.join('\n\n');
}

function quoteLine(_a: Atlas, q: Quote) {
  return q.kind === 'quotation' ? `> “${clip(q.text, 300)}” — *${q.citation}*` : `> ${clip(q.text, 300)} *(${t('paraphrase', 'கருத்துச் சுருக்கம்')}; ${q.citation})*`;
}

function describeTradition(a: Atlas, t: Tradition, related: Ref[], focusField?: keyof Tradition['profile']): string {
  const f = FAMILIES[t.family];
  const chain = lineageChain(a, t);
  const split = t.splitEventId ? a.get<Event>('event', t.splitEventId) : undefined;
  const kids = a.childrenOf.get(t.id) ?? [];
  related.push(...(split ? [{ type: 'event' as const, id: split.id }] : []), ...kids.slice(0, 4).map((k) => ({ type: 'tradition' as const, id: k.id })));
  const parts = [
    isTA()
      ? `**${link('tradition', t.id, t.name)}** — ${ui(f.label)} குடும்பம்; ${formatYear(t.foundedYear)} இல் தோன்றியது${t.endYear ? `, ${formatYear(t.endYear)} இல் முடிவுற்றது` : ''}.${t.adherents ? ` சுமார் ${Math.round(t.adherents.estimate / 1e6).toLocaleString()} மில்லியன் பின்பற்றுநர்கள் (${t.adherents.year}).` : ''}`
      : `**${link('tradition', t.id, t.name)}** — ${f.label} family, emerging ${formatYear(t.foundedYear)}${t.endYear ? ` and ending ${formatYear(t.endYear)}` : ''}.${t.adherents ? ` About ${Math.round(t.adherents.estimate / 1e6).toLocaleString()} million adherents (${t.adherents.year}).` : ''}`,
    t.summary,
  ];
  if (t.family === 'nontrinitarian') parts.push(tt('*It stands outside the historic Nicene (Trinitarian) consensus shared by Catholic, Orthodox and most Protestant churches; it is described here in its own terms.*', '*கத்தோலிக்க, ஆர்த்தடாக்ஸ் மற்றும் பெரும்பாலான புராட்டஸ்டன்ட் சபைகள் பகிர்ந்துகொள்ளும் வரலாற்று நிசேயா (திரித்துவ) ஒருமித்த நம்பிக்கைக்கு இது வெளியே நிற்கிறது; இங்கு அதன் சொந்தச் சொற்களிலேயே விவரிக்கப்படுகிறது.*'));
  if (focusField) parts.push(`**${field(focusField)}:** ${t.profile[focusField]}`);
  else parts.push(`${tt('Distinctives', 'தனித்துவங்கள்')}:\n${bullets(t.distinctives, 5)}`);
  const dp = a.profileOf.get(t.id);
  if (dp && !focusField) {
    parts.push(`${tt('Core doctrines', 'அடிப்படைக் கோட்பாடுகள்')}:\n${bullets(dp.coreDoctrines, 5)}`);
    parts.push(`${tt('Focus', 'கவனம்')}:\n${bullets(dp.focuses, 4)}`);
    const inf = dp.influencedBy.map((x) => (x.traditionId ? link('tradition', x.traditionId, a.get<Tradition>('tradition', x.traditionId)?.name ?? x.name) : x.name));
    if (inf.length) parts.push(`${tt('Shaped by', 'இதை வடிவமைத்தவை')}: ${inf.join(', ')}.`);
  }
  if (chain.length > 1) parts.push(`${tt('Lineage', 'வம்சாவளி')}: ${chain.map((c) => link('tradition', c.id, c.name)).join(' → ')}`);
  if (split) parts.push(`${tt('Founding moment', 'தோற்றத் தருணம்')}: ${link('event', split.id, split.title)} (${formatYear(split.year, split.circa)}).`);
  if (kids.length) parts.push(`${tt('Branches', 'கிளைகள்')}: ${kids.slice(0, 8).map((k) => link('tradition', k.id, k.name)).join(', ')}${kids.length > 8 ? tt(` and ${kids.length - 8} more`, `, மேலும் ${kids.length - 8}`) : ''}.`);
  return parts.join('\n\n');
}

function describeDoctrine(a: Atlas, d: Doctrine, related: Ref[]): string {
  const ps = a.positionsByDoctrine.get(d.id) ?? [];
  const debates = a.controversiesByDoctrine.get(d.id) ?? [];
  related.push(...debates.slice(0, 3).map((c) => ({ type: 'controversy' as const, id: c.id })));
  const order = ['majority', 'significant', 'minority', 'historic', 'rejected-by-councils'];
  const label: Record<string, string> = isTA()
    ? { majority: 'பெரும்பான்மைக் கருத்துகள்', significant: 'குறிப்பிடத்தக்க கருத்துகள்', minority: 'சிறுபான்மைக் கருத்துகள்', historic: 'வரலாற்றுக் கருத்துகள்', 'rejected-by-councils': 'பொதுச்சங்கங்களால் நிராகரிக்கப்பட்டவை' }
    : { majority: 'Majority views', significant: 'Significant views', minority: 'Minority views', historic: 'Historic views', 'rejected-by-councils': 'Rejected by councils' };
  const groups = order.map((s) => [s, ps.filter((p) => p.standing === s)] as const).filter(([, g]) => g.length);
  return [
    `**${link('doctrine', d.id, d.name)}** ${t('asks', 'கேட்கும் கேள்வி')}: *${d.question}*`,
    d.summary,
    ...groups.map(([s, g]) => `**${label[s]}**\n${g.slice(0, 7).map((p) => `- ${link('position', p.id, p.name)} — ${clip(p.oneLine, 160)}`).join('\n')}${g.length > 7 ? `\n- …${t('and', 'மேலும்')} ${g.length - 7}${t(' more', '')}` : ''}`),
    debates.length ? `${t('Debates', 'விவாதங்கள்')}: ${debates.map((c) => link('controversy', c.id, c.title)).join(', ')}.` : '',
  ].filter(Boolean).join('\n\n');
}

function describePosition(a: Atlas, p: Position, related: Ref[], mode: 'full' | 'arguments' = 'full'): string {
  const d = a.doctrinesByPosition.get(p.id);
  related.push(...p.relatedPositionIds.slice(0, 3).map((id) => ({ type: 'position' as const, id })));
  const parts = [
    `**${link('position', p.id, p.name)}**${d ? t(` (a view within ${link('doctrine', d.id, d.name)})`, ` (${link('doctrine', d.id, d.name)} பற்றிய ஒரு கருத்து)`) : ''}${p.originYear !== undefined ? t(`, from about ${formatYear(p.originYear)}`, `, சுமார் ${formatYear(p.originYear)} முதல்`) : ''}: ${p.oneLine}`,
  ];
  if (mode === 'full') parts.push(`${t('What its adherents hold', 'இதைப் பின்பற்றுவோரின் நம்பிக்கைகள்')}:\n${bullets(p.coreClaims, 4)}`);
  parts.push(`${t('Its strongest arguments, in its own terms', 'இதன் வலுவான வாதங்கள் (அதன் சொந்தச் சொற்களில்)')}:\n${bullets(p.strongestArguments, mode === 'full' ? 3 : 5)}`);
  parts.push(`${t('The strongest objections from other traditions', 'பிற மரபுகளின் வலுவான ஆட்சேபனைகள்')}:\n${bullets(p.strongestObjections, mode === 'full' ? 3 : 5)}`);
  if (p.responses.length) parts.push(`${t('How adherents respond', 'பின்பற்றுவோரின் பதில்')}:\n${bullets(p.responses, 3)}`);
  const who: string[] = [];
  if (p.traditionIds.length) who.push(`${t('Held by', 'ஏற்றுக்கொண்டவர்கள்')}: ${links(a, 'tradition', p.traditionIds, 6).join(', ')}`);
  if (p.proponentIds.length) who.push(`${t('Proponents', 'ஆதரவாளர்கள்')}: ${links(a, 'person', p.proponentIds, 6).join(', ')}`);
  if (p.keyTexts.length && mode === 'full') who.push(`${t('Key texts', 'முக்கிய வேதப் பகுதிகள்')}: ${p.keyTexts.slice(0, 5).join('; ')}`);
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
  if (e.causes.length) parts.push(`${mode === 'why' ? t('Why it happened', 'ஏன் நடந்தது') : t('Causes', 'காரணங்கள்')}:\n${bullets(e.causes, 5)}`);
  if (e.consequences.length) parts.push(`${t('What followed', 'அதன் விளைவுகள்')}:\n${bullets(e.consequences, 4)}`);
  if (founded.length) parts.push(`${t('Traditions that emerged from it', 'இதிலிருந்து தோன்றிய மரபுகள்')}: ${founded.map((t) => link('tradition', t.id, t.name)).join(', ')}.`);
  if (e.peopleIds.length) parts.push(`${t('People involved', 'தொடர்புடையவர்கள்')}: ${links(a, 'person', e.peopleIds, 6).join(', ')}.`);
  if (e.confidence !== 'established') parts.push(`*${t('Confidence', 'நம்பகத்தன்மை')}: ${e.confidence === 'debated' ? t('historians debate parts of this account', 'இந்த விவரத்தின் சில பகுதிகளை வரலாற்றாசிரியர்கள் விவாதிக்கின்றனர்') : t('this rests mainly on tradition or legend', 'இது பெரும்பாலும் மரபு அல்லது புராணக் கதையை அடிப்படையாகக் கொண்டது')}.*`);
  return parts.join('\n\n');
}

function describeControversy(a: Atlas, c: Controversy): string {
  return [
    `**${link('controversy', c.id, c.title)}** — *${c.question}*`,
    c.summary,
    ...c.sides.map((s) => `**${s.positionId && a.get('position', s.positionId) ? link('position', s.positionId, s.name) : s.name}** ${t('in its own voice', 'தன் சொந்தக் குரலில்')}: ${clip(s.steelman, 360)}`),
    `**${t('Outcome', 'முடிவு')} (${isTA() ? RESOLUTION_TA[c.resolution.kind] : c.resolution.kind}):** ${c.resolution.text}`,
  ].join('\n\n');
}

function describeExperience(_a: Atlas, x: Experience): string {
  const conf = (isTA()
    ? { 'well-documented': 'நன்கு ஆவணப்படுத்தப்பட்டது', contested: 'விவாதத்துக்குரியது', hagiographical: 'பெரும்பாலும் பிற்காலப் பக்தி நூல்களிலிருந்தே அறியப்படுகிறது' }
    : { 'well-documented': 'well documented', contested: 'contested', hagiographical: 'known mainly from later devotional accounts' })[x.confidence];
  return [
    `**${link('experience', x.id, x.title)}** — ${formatSpan(x.year, x.endYear, x.circa)}, ${x.place.name} (${conf}).`,
    ...(x.story ? x.story.split(/\n\s*\n/).slice(0, 3) : [x.account]),
    x.keyMoments.length ? `${t('Key moments', 'முக்கியத் தருணங்கள்')}:\n${x.keyMoments.slice(0, 6).map((m) => `- **${m.date ?? formatYear(m.year)}** — ${m.text}`).join('\n')}` : '',
    x.significance ? `${t('Why it matters', 'இதன் முக்கியத்துவம்')}: ${x.significance}` : '',
    `${t('How contemporaries saw it', 'சமகாலத்தவர் இதை எவ்வாறு கண்டனர்')}: ${x.contemporaryInterpretation}`,
    `${t('How it is assessed today', 'இன்று இது எவ்வாறு மதிப்பிடப்படுகிறது')}:\n${x.assessments.slice(0, 4).map((s) => `- **${s.perspective}:** ${clip(s.text, 220)}`).join('\n')}`,
    x.story ? `[${t('Read the full story', 'முழுக் கதையைப் படிக்க')}](entity:experience/${x.id})` : '',
  ].filter(Boolean).join('\n\n');
}

function describeWork(a: Atlas, w: Work): string {
  const q = (a.quotesByWork.get(w.id) ?? [])[0];
  return [
    `**${link('work', w.id, w.title)}** — ${ui(w.genre)}, ${formatYear(w.year, w.circa)}, ${t('by', 'எழுதியவர்')} ${w.authorId && a.get('person', w.authorId) ? L(a, { type: 'person', id: w.authorId }) : w.author ?? t('an unknown author', 'அறியப்படாத ஆசிரியர்')}.`,
    w.summary,
    `${t('Why it matters', 'இதன் முக்கியத்துவம்')}: ${w.significance}`,
    q ? quoteLine(a, q) : '',
    w.fullTextUrl ? `${t('Full text', 'முழு உரை')}: [${t('read it online', 'இணையத்தில் படிக்க')}](${w.fullTextUrl})` : '',
  ].filter(Boolean).join('\n\n');
}

function describeEra(a: Atlas, e: Era): string {
  const evs = a.eventsByEra.get(e.id) ?? [];
  return [
    `**${link('era', e.id, e.name)}** (${formatYear(e.startYear)}–${e.endYear >= 2026 ? t('today', 'இன்று') : formatYear(e.endYear)})`,
    e.summary,
    `${t('Key themes', 'முக்கியக் கருப்பொருள்கள்')}: ${e.keyThemes.join('; ')}.`,
    evs.length ? `${t('Key events', 'முக்கிய நிகழ்வுகள்')}:\n${evs.slice(0, 8).map((x) => `- ${formatYear(x.year, x.circa)}: ${link('event', x.id, x.title)}`).join('\n')}` : '',
    e.globalNotes.length ? `${t('Beyond the West', 'மேற்குலகுக்கு அப்பால்')}:\n${e.globalNotes.slice(0, 3).map((n) => `- ${clip(n.text, 200)}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

const STATUS_TA: Record<string, string> = { active: 'இன்றும் செயல்படுகிறது', transformed: 'உருமாறியது', merged: 'இணைந்தது', divided: 'பிளவுபட்டது', declined: 'நலிவடைந்தது', collapsed: 'சரிந்தது', ended: 'முடிவுற்றது' };

function describeMission(a: Atlas, m: MissionMovement, related: Ref[]): string {
  related.push(...m.relations.slice(0, 3).map((r) => ({ type: 'mission' as const, id: r.to })));
  return [
    `**${link('mission', m.id, m.name)}** — ${formatSpan(m.startYear, m.endYear)}, ${m.origin.name}. ${t('Status', 'நிலை')}: ${isTA() ? STATUS_TA[m.status] : m.status} — ${m.statusNote}`,
    m.summary,
    m.strategies.length ? `${t('Strategies', 'உத்திகள்')}:\n${bullets(m.strategies, 5)}` : '',
    m.groupsReached.length ? `${t('Who they reached', 'சென்றடைந்த மக்கள்')}: ${m.groupsReached.slice(0, 6).join('; ')}.` : '',
    m.keyPeople.length ? `${t('Key people', 'முக்கிய நபர்கள்')}:\n${m.keyPeople.slice(0, 6).map((p) => `- **${p.personId && a.get('person', p.personId) ? link('person', p.personId, p.name) : p.name}** (${p.years}) — ${p.focus}`).join('\n')}` : '',
    m.challenges.length ? `${t('Challenges', 'சவால்கள்')}:\n${bullets(m.challenges, 4)}` : '',
    m.harms.length ? `${t('Harms and failures', 'தீங்குகளும் தோல்விகளும்')}:\n${bullets(m.harms, 3)}` : '',
    m.developments.length ? `${t('Lasting contributions', 'நிலைத்த பங்களிப்புகள்')}:\n${bullets(m.developments, 4)}` : '',
    `${t('Outcome', 'விளைவு')}: ${m.outcome}`,
  ].filter(Boolean).join('\n\n');
}

function describeIndia(a: Atlas, m: IndiaMission): string {
  return [
    `**${link('india', m.id, m.title)}** — ${formatSpan(m.startYear, m.endYear)}, ${m.region}.`,
    m.summary,
    m.people.length ? `${t('Key people', 'முக்கிய நபர்கள்')}:\n${m.people.slice(0, 6).map((p) => `- **${p.personId && a.get('person', p.personId) ? link('person', p.personId, p.name) : p.name}** (${p.years}) — ${p.focus}${p.outcome ? ` → ${p.outcome}` : ''}`).join('\n')}` : '',
    m.focus.length ? `${t('Focus', 'கவனம் செலுத்தியவை')}:\n${bullets(m.focus, 4)}` : '',
    m.outcomes.length ? `${t('Outcomes', 'விளைவுகள்')}:\n${bullets(m.outcomes, 5)}` : '',
    m.harms.length ? `${t('Harms and failures', 'தீங்குகளும் தோல்விகளும்')}:\n${bullets(m.harms, 3)}` : '',
    `${t('Legacy', 'மரபுரிமை')}: ${m.legacy}`,
  ].filter(Boolean).join('\n\n');
}

const ROLE_TA: Record<string, string> = { central: 'மையக் காரணம்', major: 'முக்கியக் காரணம்', contributing: 'துணைக் காரணம்', pretext: 'சாக்குப்போக்கு' };

function describeConflict(_a: Atlas, c: Conflict, related: Ref[]): string {
  related.push(...c.ledTo.slice(0, 3).map((id) => ({ type: 'conflict' as const, id })));
  const cas = c.casualties.low || c.casualties.high ? ` ${t('Estimated deaths', 'மதிப்பிடப்பட்ட உயிரிழப்புகள்')}: ${[c.casualties.low, c.casualties.high].filter(Boolean).map((n) => n!.toLocaleString()).join('–')} (${c.casualties.note}).` : '';
  return [
    `**${link('conflict', c.id, c.name)}** — ${formatSpan(c.startYear, c.endYear)}, ${c.region}. ${t('Role of religion', 'மதத்தின் பங்கு')}: ${isTA() ? ROLE_TA[c.religionRole] : c.religionRole}.${cas}`,
    c.summary,
    `${t('In the name of God', 'கடவுளின் பெயரால்')}: ${c.nameOfGod}`,
    `${t('Sides', 'தரப்புகள்')}:\n${c.sides.map((s) => `- **${s.name}** (${s.faith})${s.leaders.length ? ` — ${s.leaders.slice(0, 3).join(', ')}` : ''}`).join('\n')}`,
    c.religiousCauses.length ? `${t('Religious causes', 'மதக் காரணங்கள்')}:\n${bullets(c.religiousCauses, 4)}` : '',
    c.otherCauses.length ? `${t('Other causes', 'பிற காரணங்கள்')}:\n${bullets(c.otherCauses, 4)}` : '',
    c.effects.length ? `${t('Effects', 'விளைவுகள்')}:\n${bullets(c.effects, 5)}` : '',
    c.effectsOnChurch.length ? `${t('Effects on the church', 'திருச்சபையின் மீதான விளைவுகள்')}:\n${bullets(c.effectsOnChurch, 4)}` : '',
    c.dissenters.length ? `${t('Christians who objected', 'எதிர்த்த கிறிஸ்தவர்கள்')}:\n${c.dissenters.slice(0, 3).map((d) => `- **${d.name}**: ${clip(d.text, 200)}`).join('\n')}` : '',
    `${t('Legacy', 'மரபுரிமை')}: ${c.legacy}`,
  ].filter(Boolean).join('\n\n');
}

const EVIDENCE_TA: Record<string, string> = { strong: 'வலுவான சான்று', plausible: 'நம்பத்தகுந்தது', disputed: 'விவாதத்துக்குரியது', myth: 'கட்டுக்கதை' };

function describeFather(a: Atlas, f: ChurchFather, related: Ref[]): string {
  related.push(...f.teachers.slice(0, 3).map((id) => ({ type: 'father' as const, id })));
  const pupils = a.fathers.filter((x) => x.teachers.includes(f.id));
  return [
    `**${link('father', f.id, f.name)}** (${formatSpan(f.born, f.died, f.circa) || t('dates uncertain', 'காலம் உறுதியில்லை')}) — ${f.see.name}. ${f.roles.slice(0, 3).join(', ')}.`,
    f.summary,
    `${t('Roots', 'வேர்கள்')}:\n${f.roots.slice(0, 5).map((r) => `- ${r.text}`).join('\n')}`,
    f.keyTeachings.length ? `${t('Key teachings', 'முக்கியப் போதனைகள்')}:\n${bullets(f.keyTeachings, 5)}` : '',
    f.teachers.length ? `${t('Shaped by', 'உருவாக்கியவர்கள்')}: ${f.teachers.filter((id) => a.get('father', id)).map((id) => L(a, { type: 'father', id })).join(', ')}` : '',
    pupils.length ? `${t('Shaped', 'இவர் உருவாக்கியவர்கள்')}: ${pupils.map((x) => link('father', x.id, x.name)).join(', ')}` : '',
    f.laterInfluence.length ? `${t('Later influence', 'பிற்காலத் தாக்கம்')}:\n${f.laterInfluence.slice(0, 4).map((x) => `- **${x.on}**: ${clip(x.text, 180)}`).join('\n')}` : '',
    f.quote ? `> “${f.quote.text}” — *${f.quote.citation}*` : '',
  ].filter(Boolean).join('\n\n');
}

function describeInfluence(_a: Atlas, p: PaganInfluence): string {
  return [
    `**${link('influence', p.id, p.name)}** — ${p.sourceCulture} → ${p.christianForm}. ${t('Evidence', 'சான்று')}: **${isTA() ? EVIDENCE_TA[p.evidence] : p.evidence}**.`,
    p.summary,
    `${t('Popular claim', 'பரவலான கூற்று')}: ${p.popularClaim}`,
    `${t('What historians say', 'வரலாற்றாசிரியர்கள் கூறுவது')}: ${p.whatHistoriansSay}`,
    p.howItHappened.length ? `${t('How it happened', 'அது எவ்வாறு நடந்தது')}:\n${bullets(p.howItHappened, 5)}` : '',
    p.rejectedBy.length ? `${t('Rejected by', 'நிராகரித்தவர்கள்')}: ${p.rejectedBy.join('; ')}` : '',
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
    case 'path': { const p = a.get<StudyPath>('path', r.id)!; return `**${link('path', p.id, p.title)}** — ${t(`a ${p.steps.length}-step guided path.`, `${p.steps.length} படிகள் கொண்ட வழிகாட்டும் பாதை.`)}\n\n${p.summary}`; }
    case 'quote': { const q = a.get<Quote>('quote', r.id)!; return quoteLine(a, q); }
    case 'mission': return describeMission(a, a.get<MissionMovement>('mission', r.id)!, related);
    case 'india': return describeIndia(a, a.get<IndiaMission>('india', r.id)!);
    case 'father': return describeFather(a, a.get<ChurchFather>('father', r.id)!, related);
    case 'influence': return describeInfluence(a, a.get<PaganInfluence>('influence', r.id)!);
    case 'conflict': return describeConflict(a, a.get<Conflict>('conflict', r.id)!, related);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tt = t;
const FIELD_TA: Record<string, string> = { authority: 'அதிகாரம்', salvation: 'இரட்சிப்பு', sacraments: 'திருவருட்சாதனங்கள்', eschatology: 'கடைசிக் காலம்', governance: 'சபை ஆட்சிமுறை', worship: 'வழிபாடு', canon: 'வேதாகம நூல் தொகுப்பு' };
const field = (k: string) => (isTA() ? FIELD_TA[k] ?? k : cap(k));
const RESOLUTION_TA: Record<string, string> = { council: 'பொதுச்சங்கம்', schism: 'பிளவு', open: 'இன்னும் தீர்க்கப்படவில்லை', mixed: 'கலவையான முடிவு', faded: 'மங்கிப்போனது', dialogue: 'உரையாடல்' };

// ---------- intents ----------

function compare(a: Atlas, x: Ref, y: Ref, related: Ref[]): string {
  if (x.type === 'position' && y.type === 'position') {
    const p = a.get<Position>('position', x.id)!, q = a.get<Position>('position', y.id)!;
    return [
      t(`Comparing ${L(a, x)} and ${L(a, y)}:`, `${L(a, x)}, ${L(a, y)} — ஒப்பீடு:`),
      `**${t('In one line', 'ஒரு வரியில்')}**\n- ${p.name}: ${p.oneLine}\n- ${q.name}: ${q.oneLine}`,
      `**${t('Core claims', 'அடிப்படைக் கூற்றுகள்')}**\n- ${p.name}: ${p.coreClaims.slice(0, 2).join(' ')}\n- ${q.name}: ${q.coreClaims.slice(0, 2).join(' ')}`,
      `**${t('Main argument for each', 'ஒவ்வொன்றுக்குமான முக்கிய வாதம்')}**\n- ${p.name}: ${p.strongestArguments[0] ?? '—'}\n- ${q.name}: ${q.strongestArguments[0] ?? '—'}`,
      `**${t('Main objection to each', 'ஒவ்வொன்றுக்குமான முக்கிய ஆட்சேபனை')}**\n- ${p.name}: ${p.strongestObjections[0] ?? '—'}\n- ${q.name}: ${q.strongestObjections[0] ?? '—'}`,
      `**${t('Held by', 'ஏற்றுக்கொண்டவர்கள்')}**\n- ${p.name}: ${links(a, 'tradition', p.traditionIds, 5).join(', ') || '—'}\n- ${q.name}: ${links(a, 'tradition', q.traditionIds, 5).join(', ') || '—'}`,
    ].join('\n\n');
  }
  if (x.type === 'tradition' && y.type === 'tradition') {
    const s = a.get<Tradition>('tradition', x.id)!, t = a.get<Tradition>('tradition', y.id)!;
    const rows = (Object.keys(s.profile) as (keyof Tradition['profile'])[]).map((k) => `**${field(k)}**\n- ${s.name}: ${s.profile[k]}\n- ${t.name}: ${t.profile[k]}`);
    const cs = lineageChain(a, s).map((c) => c.id), ct = new Set(lineageChain(a, t).map((c) => c.id));
    const common = [...cs].reverse().find((id) => ct.has(id));
    return [
      tt(`Comparing ${L(a, x)} and ${L(a, y)}:`, `${L(a, x)}, ${L(a, y)} — ஒப்பீடு:`),
      common ? tt(`Both descend from ${L(a, { type: 'tradition', id: common })}${common !== s.id && common !== t.id ? ', where their lines part' : ''}.`, `இரண்டும் ${L(a, { type: 'tradition', id: common })} மரபிலிருந்து வந்தவை${common !== s.id && common !== t.id ? '; அங்கே அவற்றின் வழிகள் பிரிகின்றன' : ''}.`) : '',
      ...rows,
    ].filter(Boolean).join('\n\n');
  }
  related.push(x, y);
  return [describe(a, x, related), '---', describe(a, y, related)].join('\n\n');
}

function beliefs(a: Atlas, t: Tradition, topic: Ref | undefined, question: string, related: Ref[]): string {
  const fieldKey = (topic && PROFILE_FOR[topic.id]) ?? PROFILE_WORDS.find(([re]) => re.test(question.toLowerCase()))?.[1];
  const parts = [`**${link('tradition', t.id, t.name)}**`];
  if (fieldKey) parts.push(`**${field(fieldKey)}:** ${t.profile[fieldKey]}`);
  if (topic?.type === 'doctrine') {
    // Positions this tradition holds, or failing that, those its parent traditions hold.
    const chain = lineageChain(a, t).reverse();
    for (const anc of chain) {
      const ps = (a.positionsByDoctrine.get(topic.id) ?? []).filter((p) => p.traditionIds.includes(anc.id));
      if (ps.length) {
        parts.push(`${anc.id === t.id ? tt('Positions it holds', 'இது கொண்டுள்ள நிலைப்பாடுகள்') : tt(`Positions held in its parent tradition, ${link('tradition', anc.id, anc.name)}`, `இதன் தாய் மரபான ${link('tradition', anc.id, anc.name)} கொண்டுள்ள நிலைப்பாடுகள்`)} ${tt('on', '—')} ${L(a, topic)}:\n${ps.slice(0, 6).map((p) => `- ${link('position', p.id, p.name)} — ${clip(p.oneLine, 170)}`).join('\n')}`);
        break;
      }
    }
  }
  if (parts.length === 1) return describeTradition(a, t, related);
  parts.push(`${tt('Distinctives', 'தனித்துவங்கள்')}:\n${bullets(t.distinctives, 3)}`);
  return parts.join('\n\n');
}

function yearsIn(q: string): [number, number] | null {
  const s = q.toLowerCase().replace(/கி\.?\s?பி\.?\s?/g, 'ad ').replace(/(\d{1,2})\s*-?\s*(ஆம்|வது)\s*நூற்றாண்ட/g, '$1th century').replace(/(\d{2,4})\s*(முதல்|இலிருந்து)\s*(\d{2,4})\s*வரை/g, 'between $1 and $3').replace(/(\d{3,4})\s*(இல்|ல்)/g, 'in $1');
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
  if (!evs.length) return t(`The atlas has no events recorded between ${formatYear(from)} and ${formatYear(to)}.${era ? ` That period falls in ${link('era', era.id, era.name)}.` : ''}`, `${formatYear(from)} முதல் ${formatYear(to)} வரை அட்லஸில் நிகழ்வுகள் எதுவும் பதிவாகவில்லை.${era ? ` அந்தக் காலம் ${link('era', era.id, era.name)} காலகட்டத்தில் அடங்கும்.` : ''}`);
  return [
    t(`Between ${formatYear(Math.max(from, 0) || from)} and ${formatYear(to)}${era ? `, during ${link('era', era.id, era.name)}` : ''}, the atlas records:`, `${formatYear(Math.max(from, 0) || from)} முதல் ${formatYear(to)} வரை${era ? ` (${link('era', era.id, era.name)} காலகட்டத்தில்)` : ''} அட்லஸ் பதிவு செய்துள்ளவை:`),
    evs.slice(0, 14).map((e) => `- **${formatYear(e.year, e.circa)}** — ${link('event', e.id, e.title)}: ${clip(e.summary, 140)}`).join('\n'),
    evs.length > 14 ? t(`…and ${evs.length - 14} more on the [timeline](entity:era/${era?.id ?? 'contemporary'}).`, `…மேலும் ${evs.length - 14} நிகழ்வுகள் [காலவரிசையில்](entity:era/${era?.id ?? 'contemporary'}).`) : '',
  ].filter(Boolean).join('\n\n');
}

const HELP_TA = `நான் அட்லஸின் இணையமில்லா வழிகாட்டி. இணையமோ AI சேவையோ இல்லாமல், உங்கள் உலாவியிலேயே அட்லஸின் பதிவுகளிலிருந்து பதில் தருகிறேன். இப்படிக் கேட்டுப் பாருங்கள்:

- அத்தனாசியஸ் **யார்**? · தெய்வீகமாக்கல் **என்றால் என்ன**?
- பெரும் பிளவு **ஏன்** நடந்தது? · கல்கதோன் பொதுச்சங்கம் **எப்போது** நடந்தது?
- அசெம்பிளீஸ் ஆஃப் காட் சபையின் **வேர்களை** ஆதித் திருச்சபை வரை காட்டு
- தண்டனைப் பதிலீடு **மற்றும்** கிறிஸ்து வெற்றியாளர் **ஒப்பிடு** · லூத்தரன் **மற்றும்** சீர்திருத்தச் சபை **ஒப்பிடு**
- மெதடிஸ்ட்கள் இரட்சிப்பைப் பற்றி **என்ன நம்புகிறார்கள்**?
- ஞானஸ்நானம் பற்றிய **கருத்துகள்** என்ன? · வரங்கள் நின்றுபோனது என்ற கொள்கைக்கு **ஆதரவான, எதிரான வாதங்கள்**
- 4-ஆம் **நூற்றாண்டில் என்ன நடந்தது**? · 1500 முதல் 1550 வரை?

ஆங்கிலப் பெயர்களிலும் கேட்கலாம் (உதா. "Who was Augustine?"). "அவர் என்ன எழுதினார்?" போன்ற தொடர் கேள்விகளுக்கு அதே பொருளைத் தொடர்வேன்.`;

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
  if (!q || /^\s*(help|hi|hello|hey|what can you do|how do i use|உதவி|வணக்கம்)/i.test(q)) return { text: isTA() ? HELP_TA : HELP, steps, related };

  // Fact checks about denominations ("how many denominations are there?", "30,000 denominations").
  if (a.denomFacts.length && (/\b(denominations?|30,?000|33,?000|45,?000|47,?000)\b/.test(ql) || /(சபைப் பிரிவு|சபைப்பிரிவு|பிரிவுகள்)/.test(ql)) && /\b(how many|number|really|true|30|33|45|47)\b|எத்தனை|உண்மை/.test(ql)) {
    const f = a.denomFacts[0];
    steps.push(t('Checked the denomination fact checks', 'சபைப் பிரிவு உண்மைச் சரிபார்ப்புகளைப் பார்த்தேன்'));
    const figs = f.figures.slice(0, 6).map((g) => `- ${g.label}${g.year ? ` (${g.year})` : ''}: **${g.value.toLocaleString('en-IN')}**`).join('\n');
    return { text: `**${f.question}**\n\n${f.answer}\n\n${f.explanation.split(/\n\s*\n/)[0]}${figs ? `\n\n${figs}` : ''}\n\n${t('See the Denominations page for the full fact check and the mind map.', 'முழு உண்மைச் சரிபார்ப்புக்கும் மன வரைபடத்துக்கும் சபைப் பிரிவுகள் பக்கத்தைப் பாருங்கள்.')}`, steps, related };
  }

  let found = recognise(a, q).map((h) => h.ref);
  if (found.length) steps.push(`${t('Recognised', 'அடையாளம் கண்டவை:')} ${found.slice(0, 4).map((r) => name(a, r)).join(', ')}`);

  // Follow-ups: "what did he write", "what came of it" keep the previous subject.
  const followUp = (/\b(he|she|him|her|his|its|it|they|them|their|this|that)\b/.test(ql) || /(அவர்|அவள்|அது|இது|அவை|அதன்|இதன்|அவரது|அவருடைய)/.test(ql)) && found.length === 0;
  if (!found.length && followUp && focus && a.get(focus.type, focus.id)) {
    found = [focus];
    steps.push(t(`Following up on ${name(a, focus)}`, `${name(a, focus)} பற்றிய தொடர் கேள்வி`));
  }

  const years = yearsIn(q);
  const wantsTimeline = /\b(what happened|events|timeline|happen(ed)? in|during the|century|centuries)\b/.test(ql) || /(என்ன நடந்த|நிகழ்வுகள்|காலவரிசை|நூற்றாண்ட)/.test(ql) || (years && !found.some((f) => f.type !== 'era'));
  if (wantsTimeline && years) {
    steps.push(`${t('Checked the timeline', 'காலவரிசையைப் பார்த்தேன்:')} ${formatYear(years[0])}–${formatYear(years[1])}`);
    return { text: timeline(a, years), steps, related };
  }

  if (!found.length) {
    const hits = getFuse(a).search(q, { limit: 6 }).map((r) => r.item);
    steps.push(t(`Searched the atlas for “${clip(q, 50)}”`, `அட்லஸில் “${clip(q, 50)}” என்று தேடினேன்`));
    if (!hits.length) return { text: t(`I couldn't find anything in the atlas for that. Try naming a person, council, doctrine, church or year — or type **help** for examples.`, `அட்லஸில் இதற்கு எதுவும் கிடைக்கவில்லை. ஒரு நபர், பொதுச்சங்கம், கோட்பாடு, சபை அல்லது ஆண்டைக் குறிப்பிட்டுக் கேளுங்கள் — எடுத்துக்காட்டுகளுக்கு **உதவி** என்று தட்டச்சு செய்யுங்கள்.`), steps, related };
    const top = { type: hits[0].type, id: hits[0].id };
    const rest = hits.slice(1).map((h) => `- ${link(h.type, h.id, h.title)} — ${clip(h.text, 120)}`);
    return {
      text: `${describe(a, top, related)}\n\n**${t('Other entries that may help', 'உதவக்கூடிய பிற பதிவுகள்')}**\n${rest.join('\n')}`,
      steps, focus: top, related,
    };
  }

  const [x, y] = found;
  const of = <T extends EntityType>(t: T) => found.find((f) => f.type === t);

  // Compare two things.
  if (y && (/\b(compare|comparison|difference|differ|versus|vs|contrast|similar)\b/.test(ql) || /(ஒப்பிடு|ஒப்பீடு|வேறுபாடு|வித்தியாச|ஒற்றுமை)/.test(ql))) {
    steps.push(t(`Compared ${name(a, x)} with ${name(a, y)}`, `${name(a, x)}, ${name(a, y)} ஒப்பிட்டேன்`));
    return { text: compare(a, x, y, related), steps, focus: x, related };
  }

  // Lineage and origins of a church.
  const trad = of('tradition');
  if (trad && (/\b(trace|lineage|origin|origins|come from|came from|descend|descended|roots|family tree|split|separate|separated|branch|ancestors|founded|begin|began|start|started)\b/.test(ql) || /(வேர்|தோற்ற|வம்சாவளி|எங்கிருந்து|பிரிந்த|தொடங்கி|ஆரம்ப|குடும்ப மர)/.test(ql))) {
    const t = a.get<Tradition>('tradition', trad.id)!;
    const chain = lineageChain(a, t);
    steps.push(tt(`Traced the lineage of ${t.name}`, `${t.name} வம்சாவளியைக் கண்டறிந்தேன்`));
    const splits = chain.map((c) => (c.splitEventId ? a.get<Event>('event', c.splitEventId) : undefined)).filter(Boolean) as Event[];
    const text = [
      tt(`**${link('tradition', t.id, t.name)}** goes back through ${chain.length - 1} generation${chain.length === 2 ? '' : 's'} of the family tree:`, `**${link('tradition', t.id, t.name)}** குடும்ப மரத்தில் ${chain.length - 1} தலைமுறைகள் பின்னோக்கிச் செல்கிறது:`),
      chain.map((c, i) => `${i + 1}. ${link('tradition', c.id, c.name)} — ${tt('from ', '')}${formatYear(c.foundedYear)}${tt('', ' முதல்')}${c.splitEventId && a.get('event', c.splitEventId) ? ` (${L(a, { type: 'event', id: c.splitEventId })})` : ''}`).join('\n'),
      t.parentIds.length > 1 ? `${tt('It also draws on', 'இது இவற்றிலிருந்தும் பெறுகிறது:')} ${links(a, 'tradition', t.parentIds.slice(1)).join(', ')}.` : '',
      ...splits.slice(-2).map((e) => `**${tt('Behind', 'பின்னணி:')} ${link('event', e.id, e.title)} (${formatYear(e.year, e.circa)}):**\n${bullets(e.causes, 3)}`),
      t.summary,
    ].filter(Boolean).join('\n\n');
    return { text, steps, focus: trad, related };
  }

  // What a church believes about a topic.
  if (trad && (/\b(believe|believes|belief|beliefs|teach|teaches|teaching|view|views|hold|holds|say|says|think|position|stance|understand)\b/.test(ql) || /(நம்பு|நம்பிக்கை|போதி|போதனை|கருத்து|நிலைப்பாடு|கூறு|சொல்)/.test(ql))) {
    const topic = found.find((f) => f.type === 'doctrine');
    steps.push(t(`Read what ${name(a, trad)} holds${topic ? ` on ${name(a, topic)}` : ''}`, `${name(a, trad)}${topic ? ` ${name(a, topic)} குறித்து` : ''} கொண்டுள்ள நம்பிக்கையைப் படித்தேன்`));
    return { text: beliefs(a, a.get<Tradition>('tradition', trad.id)!, topic, q, related), steps, focus: trad, related };
  }

  // What a person taught about a doctrine.
  const who = of('person');
  const topicDoc = of('doctrine');
  if (who && topicDoc && (/\b(teach|taught|believe|believed|think|thought|say|said|view|views|hold|held|about|on)\b/.test(ql) || /(போதி|நம்பி|கருத்து|பற்றி|குறித்து|சொன்ன|கூறிய)/.test(ql))) {
    const p = a.get<Person>('person', who.id)!;
    // Put first the positions that mention the question's own words (e.g. "predestination").
    const words = ql.split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w));
    const score = (x: Position) => words.filter((w) => (x.name + ' ' + x.oneLine + ' ' + x.coreClaims.join(' ')).toLowerCase().includes(w)).length;
    const ps = (a.positionsByDoctrine.get(topicDoc.id) ?? []).filter((x) => x.proponentIds.includes(p.id)).sort((x, y) => score(y) - score(x));
    steps.push(t(`Read what ${p.name} taught on ${name(a, topicDoc)}`, `${name(a, topicDoc)} குறித்து ${p.name} போதித்ததைப் படித்தேன்`));
    if (ps.length) {
      return {
        text: [
          t(`**${link('person', p.id, p.name)}** is listed as a proponent of ${ps.length === 1 ? 'this position' : 'these positions'} on ${L(a, topicDoc)}:`, `${L(a, topicDoc)} குறித்த ${ps.length === 1 ? 'இந்த நிலைப்பாட்டின்' : 'இந்த நிலைப்பாடுகளின்'} ஆதரவாளராக **${link('person', p.id, p.name)}** குறிப்பிடப்படுகிறார்:`),
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
  if (pos && (/\b(argument|arguments|for and against|case for|case against|objection|objections|criticism|critique|defend|support|evidence|pros|cons)\b/.test(ql) || /(வாத|ஆட்சேப|விமர்சன|ஆதரவ|எதிர்ப்ப|சான்று)/.test(ql))) {
    steps.push(t(`Read the arguments for and against ${name(a, pos)}`, `${name(a, pos)} — ஆதரவான, எதிரான வாதங்களைப் படித்தேன்`));
    return { text: describePosition(a, a.get<Position>('position', pos.id)!, related, 'arguments'), steps, focus: pos, related };
  }

  // Views on a doctrine.
  const doc = of('doctrine');
  if (doc && !pos && (x.type === 'doctrine' || /\b(views|positions|theories|schools|options|beliefs|perspectives|opinions)\b/.test(ql) || /(கருத்துகள்|நிலைப்பாடுகள்|கொள்கைகள்)/.test(ql))) {
    steps.push(t(`Listed the positions on ${name(a, doc)}`, `${name(a, doc)} பற்றிய நிலைப்பாடுகளைப் பட்டியலிட்டேன்`));
    return { text: describeDoctrine(a, a.get<Doctrine>('doctrine', doc.id)!, related), steps, focus: doc, related };
  }

  // Why / when about an event.
  const ev = of('event');
  if (ev && (/\b(why|cause|caused|reason|reasons|led to|lead to|result|results|consequence|consequences|effect)\b/.test(ql) || /(ஏன்|காரண|விளைவ|பின்விளைவ)/.test(ql))) {
    steps.push(t(`Read the causes and consequences of ${name(a, ev)}`, `${name(a, ev)} — காரணங்களையும் விளைவுகளையும் படித்தேன்`));
    return { text: describeEvent(a, a.get<Event>('event', ev.id)!, related, 'why'), steps, focus: ev, related };
  }
  if (/\bwhen\b/.test(ql) || /(எப்போது|எந்த ஆண்டு|எந்தக் காலம்)/.test(ql)) {
    const r = ev ?? x;
    steps.push(t(`Looked up the date of ${name(a, r)}`, `${name(a, r)} — காலத்தைத் தேடினேன்`));
    if (r.type === 'event') return { text: describeEvent(a, a.get<Event>('event', r.id)!, related, 'when'), steps, focus: r, related };
    if (r.type === 'person') { const p = a.get<Person>('person', r.id)!; return { text: `${t(`${link('person', p.id, p.name)} lived`, `${link('person', p.id, p.name)} வாழ்ந்த காலம்:`)} ${formatSpan(p.born, p.died, p.circa) || t('(dates uncertain)', '(காலம் உறுதியில்லை)')}.\n\n${p.summary}`, steps, focus: r, related }; }
    if (r.type === 'tradition') { const t = a.get<Tradition>('tradition', r.id)!; return { text: `${link('tradition', t.id, t.name)} ${tt('emerged in', 'தோன்றிய காலம்:')} ${formatYear(t.foundedYear)}${t.splitEventId && a.get('event', t.splitEventId) ? ` (${L(a, { type: 'event', id: t.splitEventId })})` : ''}.\n\n${t.summary}`, steps, focus: r, related }; }
  }

  // Follow-up questions about a person's writings or quotes.
  const per = of('person');
  if (per && (/\b(write|wrote|writings|works|books|said|say|quote|quotes|words)\b/.test(ql) || /(எழுதி|எழுத்து|நூல்|புத்தக|மேற்கோள்|வார்த்தை|சொன்ன)/.test(ql))) {
    const p = a.get<Person>('person', per.id)!;
    const works = a.worksByAuthor.get(p.id) ?? [];
    const quotes = a.quotesByPerson.get(p.id) ?? [];
    steps.push(t(`Read the writings and quotations of ${p.name}`, `${p.name} எழுதியவற்றையும் மேற்கோள்களையும் படித்தேன்`));
    return {
      text: [
        `**${link('person', p.id, p.name)}**`,
        works.length ? `${t('Writings in the atlas', 'அட்லஸில் உள்ள எழுத்துகள்')}:\n${works.map((w) => `- ${link('work', w.id, w.title)} (${formatYear(w.year, w.circa)}) — ${clip(w.summary, 140)}`).join('\n')}` : t('The atlas has no writings recorded for this person yet.', 'இவரது எழுத்துகள் எதுவும் இன்னும் அட்லஸில் பதிவாகவில்லை.'),
        quotes.length ? `${t('In their words', 'அவரது சொந்த வார்த்தைகளில்')}:\n\n${quotes.slice(0, 3).map((qq) => quoteLine(a, qq)).join('\n\n')}` : '',
      ].filter(Boolean).join('\n\n'),
      steps, focus: per, related,
    };
  }

  // Default: describe what was named (the first two, if two different things were named).
  steps.push(t(`Read the entry for ${name(a, x)}`, `${name(a, x)} பதிவைப் படித்தேன்`));
  const text = y && y.type !== x.type ? `${describe(a, x, related)}\n\n---\n\n${describe(a, y, related)}` : describe(a, x, related);
  return { text, steps, focus: x, related };
}
