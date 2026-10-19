import { eraForYear, type Db, TYPE_TO_KEY } from './build';
import { applyTranslations } from '../i18n/apply';
import { getLang, type Lang } from '../i18n/lang';
import type { EntityType, Era, Event, Person, Position, Quote, Tradition, Work, Controversy, Experience, Doctrine } from './schema';

export interface Atlas extends Db {
  get: <T = unknown>(type: EntityType, id: string) => T | undefined;
  eraOf: (year: number) => Era | undefined;
  quotesByPerson: Map<string, Quote[]>;
  quotesByWork: Map<string, Quote[]>;
  worksByAuthor: Map<string, Work[]>;
  positionsByDoctrine: Map<string, Position[]>;
  controversiesByDoctrine: Map<string, Controversy[]>;
  eventsByEra: Map<string, Event[]>;
  childrenOf: Map<string, Tradition[]>;
  peopleByTradition: Map<string, Person[]>;
  experiencesByPerson: Map<string, Experience[]>;
  positionsByPerson: Map<string, Position[]>;
  doctrinesByPosition: Map<string, Doctrine>;
  influenced: Map<string, Person[]>;
  warnings: string[];
}

function group<T>(items: T[], keys: (t: T) => (string | undefined)[]) {
  const m = new Map<string, T[]>();
  for (const it of items) for (const k of keys(it)) if (k) { if (!m.has(k)) m.set(k, []); m.get(k)!.push(it); }
  return m;
}

const atlases: Partial<Record<Lang, Atlas>> = {};
const pending: Partial<Record<Lang, Promise<Atlas>>> = {};
let englishDb: Db | undefined;

async function loadEnglishDb(): Promise<Db> {
  // Content is merged and validated at build time (scripts/bundle-content.ts); the browser just loads it.
  englishDb ??= (await import('../generated/atlas-db.json')).default as unknown as Db;
  return englishDb;
}

/** Loads the atlas in a language (the current one by default). Tamil is unpacked from its overlay on first use. */
export function loadAtlas(lang: Lang = getLang()): Promise<Atlas> {
  const done = atlases[lang];
  if (done) return Promise.resolve(done);
  pending[lang] ??= (async () => {
    const en = await loadEnglishDb();
    let db = en;
    if (lang === 'ta') {
      const [{ gunzipSync, strFromU8 }, packed] = await Promise.all([import('fflate'), import('../generated/ta-overlay.txt?raw')]);
      const bin = atob(packed.default);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const overlay = JSON.parse(strFromU8(gunzipSync(bytes))) as Record<string, string>;
      db = JSON.parse(JSON.stringify(en)) as Db;
      applyTranslations(db as unknown as Record<string, { id: string }[]>, overlay);
    }
    return (atlases[lang] = createAtlas(db));
  })();
  return pending[lang]!;
}

export function useAtlas(): Atlas {
  const a = atlases[getLang()];
  if (!a) throw loadAtlas();
  return a;
}

/** English names of entries ("person/augustine" → "Augustine of Hippo"), so the Tamil guide also understands English. */
export function englishNames(): Record<string, string> {
  const out: Record<string, string> = {};
  const TYPES: [keyof Db, EntityType][] = [['doctrines', 'doctrine'], ['traditions', 'tradition'], ['people', 'person'], ['positions', 'position'], ['events', 'event'], ['controversies', 'controversy'], ['experiences', 'experience'], ['works', 'work'], ['eras', 'era'], ['missions', 'mission'], ['indiaMissions', 'india'], ['conflicts', 'conflict'], ['fathers', 'father'], ['influences', 'influence']];
  if (englishDb) for (const [coll, type] of TYPES) for (const e of englishDb[coll] as unknown as Record<string, string>[]) out[`${type}/${e.id}`] = e.name ?? e.title;
  return out;
}

/** Builds lookup maps and relations over a merged content database (usable in the browser and in Node). */
export function createAtlas(db: Db, warnings: string[] = []): Atlas {
  const maps = new Map<string, Map<string, unknown>>();
  for (const [type, key] of Object.entries(TYPE_TO_KEY)) {
    maps.set(type, new Map((db[key] as { id: string }[]).map((e) => [e.id, e])));
  }
  const eraOf = (y: number) => eraForYear(db.eras, y);
  const doctrinesByPosition = new Map<string, Doctrine>();
  const docById = new Map(db.doctrines.map((d) => [d.id, d]));
  for (const p of db.positions) { const d = docById.get(p.doctrineId); if (d) doctrinesByPosition.set(p.id, d); }

  return {
    ...db,
    warnings,
    get: <T,>(type: EntityType, id: string) => maps.get(type)?.get(id) as T | undefined,
    eraOf,
    quotesByPerson: group(db.quotes, (q) => [q.personId]),
    quotesByWork: group(db.quotes, (q) => [q.workId]),
    worksByAuthor: group(db.works, (w) => [w.authorId]),
    positionsByDoctrine: group(db.positions, (p) => [p.doctrineId]),
    controversiesByDoctrine: group(db.controversies, (c) => c.doctrineIds),
    eventsByEra: group(db.events, (e) => [eraOf(e.year)?.id]),
    childrenOf: group(db.traditions, (t) => t.parentIds),
    peopleByTradition: group(db.people, (p) => p.traditionIds),
    experiencesByPerson: group(db.experiences, (x) => x.personIds),
    positionsByPerson: group(db.positions, (p) => p.proponentIds),
    doctrinesByPosition,
    influenced: group(db.people, (p) => p.influencedBy),
  };
}

export const ROUTE_FOR: Record<EntityType, string> = {
  mission: '/missions',
  india: '/missions/india',
  conflict: '/wars',
  father: '/fathers',
  influence: '/influences',
  era: '/eras',
  event: '/events',
  person: '/people',
  work: '/library',
  quote: '/quotes',
  doctrine: '/doctrines',
  position: '/positions',
  tradition: '/traditions',
  controversy: '/debates',
  experience: '/experiences',
  comparison: '/compare/featured',
  path: '/paths',
};

export function hrefFor(type: EntityType, id: string) {
  if (type === 'quote') return `/quotes#${id}`;
  return `${ROUTE_FOR[type]}/${id}`;
}

export function labelFor(a: Atlas, type: EntityType, id: string): string {
  const e = a.get<Record<string, unknown>>(type, id);
  if (!e) return id;
  return (e.name ?? e.title ?? e.label ?? e.question ?? (typeof e.text === 'string' ? e.text.slice(0, 60) + '…' : id)) as string;
}
