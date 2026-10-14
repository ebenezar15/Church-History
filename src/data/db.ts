import { buildDb, eraForYear, type Db, TYPE_TO_KEY } from './build';
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

let atlas: Atlas | undefined;
let pending: Promise<Atlas> | undefined;

/** Each content pack is its own chunk; they are fetched in parallel after the shell paints. */
export function loadAtlas(): Promise<Atlas> {
  if (atlas) return Promise.resolve(atlas);
  pending ??= (async () => {
    const loaders = import.meta.glob('/content/**/*.json', { import: 'default' });
    const entries = await Promise.all(Object.entries(loaders).map(async ([k, load]) => [k, await load()] as const));
    const { db, errors, warnings } = buildDb(Object.fromEntries(entries));
    if (errors.length) console.warn(`Ecclesia Atlas: ${errors.length} content errors (run npm run validate)`, errors.slice(0, 20));
    atlas = index(db, warnings);
    return atlas;
  })();
  return pending;
}

export function useAtlas(): Atlas {
  if (!atlas) throw loadAtlas();
  return atlas;
}

function index(db: Db, warnings: string[]): Atlas {
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
