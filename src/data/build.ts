/**
 * Merges content packs into a single database and checks every cross-reference.
 * Used both by the app (at runtime) and by scripts/validate-content.ts (at build time).
 *
 * Merge rule: an entity of the same type and id may appear in several packs
 * (e.g. a person first mentioned by the Trinity pack and extended by the
 * Christology pack). Arrays are unioned; for scalar fields the first non-empty
 * value wins and a conflicting value produces a warning. Doctrines and
 * positions must be declared exactly once.
 */
import {
  Pack,
  type Comparison,
  type Controversy,
  type Culture,
  type Doctrine,
  type EntityType,
  type Era,
  type Event,
  type Experience,
  type Person,
  type Position,
  type Presence,
  type MissionMovement,
  type IndiaMission,
  type Conflict,
  type ChurchFather,
  type PaganInfluence,
  type Quote,
  type Source,
  type StudyPath,
  type Tradition,
  type DenomProfile,
  type FamilyProfile,
  type DenomFact,
  type Work,
} from './schema';

export interface Db {
  sources: Source[];
  eras: Era[];
  cultures: Culture[];
  events: Event[];
  people: Person[];
  works: Work[];
  quotes: Quote[];
  doctrines: Doctrine[];
  positions: Position[];
  traditions: Tradition[];
  controversies: Controversy[];
  experiences: Experience[];
  comparisons: Comparison[];
  paths: StudyPath[];
  presences: Presence[];
  missions: MissionMovement[];
  indiaMissions: IndiaMission[];
  conflicts: Conflict[];
  fathers: ChurchFather[];
  influences: PaganInfluence[];
  denomProfiles: DenomProfile[];
  familyProfiles: FamilyProfile[];
  denomFacts: DenomFact[];
}

export type DbKey = keyof Db;

export const TYPE_TO_KEY: Record<EntityType, DbKey> = {
  era: 'eras',
  event: 'events',
  person: 'people',
  work: 'works',
  quote: 'quotes',
  doctrine: 'doctrines',
  position: 'positions',
  tradition: 'traditions',
  controversy: 'controversies',
  experience: 'experiences',
  comparison: 'comparisons',
  path: 'paths',
  mission: 'missions',
  india: 'indiaMissions',
  conflict: 'conflicts',
  father: 'fathers',
  influence: 'influences',
};

const STRICT_ONCE: DbKey[] = ['doctrines', 'positions', 'controversies', 'comparisons', 'paths', 'eras', 'missions', 'indiaMissions', 'conflicts', 'fathers', 'influences', 'denomProfiles', 'familyProfiles', 'denomFacts'];

export interface BuildResult {
  db: Db;
  errors: string[];
  warnings: string[];
}

function emptyDb(): Db {
  return {
    sources: [], eras: [], cultures: [], events: [], people: [], works: [], quotes: [], doctrines: [],
    positions: [], traditions: [], controversies: [], experiences: [], comparisons: [], paths: [], presences: [], missions: [], indiaMissions: [], conflicts: [], fathers: [], influences: [], denomProfiles: [], familyProfiles: [], denomFacts: [],
  };
}

function isEmpty(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function mergeInto(target: Record<string, unknown>, extra: Record<string, unknown>, label: string, warnings: string[]) {
  for (const [k, v] of Object.entries(extra)) {
    const cur = target[k];
    if (Array.isArray(cur) && Array.isArray(v)) {
      const seen = new Set(cur.map((x) => JSON.stringify(x)));
      for (const item of v) if (!seen.has(JSON.stringify(item))) cur.push(item);
    } else if (isEmpty(cur)) {
      target[k] = v;
    } else if (typeof v === 'number' && typeof cur === 'number' && cur !== v) {
      warnings.push(`${label}: conflicting "${k}" (${JSON.stringify(cur)} vs ${JSON.stringify(v)}); kept the first`);
    }
  }
}

export function buildDb(files: Record<string, unknown>): BuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const db = emptyDb();
  const index = new Map<string, { file: string; obj: Record<string, unknown> }>();

  for (const [file, raw] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const parsed = Pack.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 25)) {
        errors.push(`${file}: ${issue.path.join('.')} — ${issue.message}`);
      }
      continue;
    }
    for (const [key, list] of Object.entries(parsed.data) as [DbKey, { id: string }[]][]) {
      for (const ent of list) {
        const k = `${key}:${ent.id}`;
        const prev = index.get(k);
        if (prev) {
          if (STRICT_ONCE.includes(key)) {
            errors.push(`${file}: duplicate ${key} id "${ent.id}" (also in ${prev.file})`);
          } else {
            mergeInto(prev.obj, ent as unknown as Record<string, unknown>, `${key}:${ent.id}`, warnings);
          }
          continue;
        }
        const obj = JSON.parse(JSON.stringify(ent)) as unknown as Record<string, unknown>;
        index.set(k, { file, obj });
        (db[key] as unknown[]).push(obj);
      }
    }
  }

  const originOf = (key: DbKey, id: string) => index.get(`${key}:${id}`)?.file ?? '?';
  checkRefs(db, errors, warnings, originOf);
  db.eras.sort((a, b) => a.order - b.order);
  db.doctrines.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  db.events.sort((a, b) => a.year - b.year);
  return { db, errors, warnings };
}

function checkRefs(db: Db, errors: string[], warnings: string[], originOf: (key: DbKey, id: string) => string) {
  const ids = Object.fromEntries(
    (Object.keys(db) as DbKey[]).map((k) => [k, new Set((db[k] as { id: string }[]).map((e) => e.id))]),
  ) as Record<DbKey, Set<string>>;

  const need = (where: string, key: DbKey, list: (string | undefined)[] | undefined) => {
    for (const id of list ?? []) {
      if (id && !ids[key].has(id)) errors.push(`${where} → missing ${key} "${id}"`);
    }
  };

  for (const e of db.cultures) { need(`${originOf('cultures', e.id)} culture:${e.id}`, 'eras', [e.eraId]); need(`${originOf('cultures', e.id)} culture:${e.id}`, 'sources', e.sources); }
  for (const e of db.events) {
    const w = `${originOf('events', e.id)} event:${e.id}`;
    need(w, 'people', e.peopleIds); need(w, 'doctrines', e.doctrineIds); need(w, 'traditions', e.traditionIds); need(w, 'sources', e.sources);
  }
  for (const e of db.people) {
    const w = `${originOf('people', e.id)} person:${e.id}`;
    need(w, 'traditions', e.traditionIds); need(w, 'people', e.influencedBy); need(w, 'sources', e.sources);
    if (!e.summary) errors.push(`${w}: no summary (referenced but never defined with content?)`);
  }
  for (const e of db.works) { const w = `${originOf('works', e.id)} work:${e.id}`; need(w, 'people', [e.authorId]); need(w, 'doctrines', e.doctrineIds); need(w, 'sources', e.sources); }
  for (const e of db.quotes) {
    const w = `${originOf('quotes', e.id)} quote:${e.id}`;
    need(w, 'people', [e.personId]); need(w, 'works', [e.workId]); need(w, 'doctrines', e.doctrineIds);
  }
  for (const d of db.doctrines) {
    const w = `${originOf('doctrines', d.id)} doctrine:${d.id}`;
    need(w, 'sources', d.sources);
    const nodeIds = new Set(d.flow.nodes.map((n) => n.id));
    if (nodeIds.size !== d.flow.nodes.length) errors.push(`${w}: duplicate flow node ids`);
    for (const n of d.flow.nodes) {
      need(`${w}/node:${n.id}`, 'quotes', n.quoteIds);
      if (n.ref) need(`${w}/node:${n.id}`, TYPE_TO_KEY[n.ref.type], [n.ref.id]);
    }
    for (const ed of d.flow.edges) {
      if (!nodeIds.has(ed.from) || !nodeIds.has(ed.to)) errors.push(`${w}: edge ${ed.from}→${ed.to} has a missing endpoint`);
    }
  }
  for (const p of db.positions) {
    const w = `${originOf('positions', p.id)} position:${p.id}`;
    need(w, 'doctrines', [p.doctrineId]); need(w, 'people', p.proponentIds); need(w, 'traditions', p.traditionIds);
    need(w, 'positions', p.relatedPositionIds); need(w, 'sources', p.sources);
  }
  for (const t of db.traditions) {
    const w = `${originOf('traditions', t.id)} tradition:${t.id}`;
    need(w, 'traditions', t.parentIds); need(w, 'events', [t.splitEventId]); need(w, 'sources', t.sources);
  }
  for (const c of db.controversies) {
    const w = `${originOf('controversies', c.id)} controversy:${c.id}`;
    need(w, 'doctrines', c.doctrineIds); need(w, 'sources', c.sources);
    for (const s of c.sides) { need(w, 'positions', [s.positionId]); need(w, 'quotes', s.quoteIds); }
    need(w, 'events', c.timeline.map((t) => t.eventId));
  }
  for (const x of db.experiences) {
    const w = `${originOf('experiences', x.id)} experience:${x.id}`;
    need(w, 'people', x.personIds); need(w, 'traditions', x.traditionIds); need(w, 'sources', x.sources);
  }
  for (const c of db.comparisons) {
    const w = `${originOf('comparisons', c.id)} comparison:${c.id}`;
    need(w, 'sources', c.sources);
    for (const col of c.columns) { need(w, 'positions', col.positionIds); need(w, 'people', col.proponentIds); }
    for (const r of c.rows) if (r.cells.length !== c.columns.length) errors.push(`${w}: row "${r.topic}" has ${r.cells.length} cells for ${c.columns.length} columns`);
  }
  for (const p of db.paths) {
    const w = `${originOf('paths', p.id)} path:${p.id}`;
    for (const s of p.steps) for (const r of s.refs) need(w, TYPE_TO_KEY[r.type], [r.id]);
    p.quiz.forEach((q, i) => { if (q.answer >= q.options.length) errors.push(`${w}: quiz ${i} answer out of range`); });
  }
  for (const p of db.presences) need(`${originOf('presences', p.id)} presence:${p.id}`, 'sources', p.sources);

  for (const m of db.missions) {
    const w = `${originOf('missions', m.id)} mission:${m.id}`;
    need(w, 'traditions', m.traditionIds); need(w, 'missions', m.influencedBy); need(w, 'sources', m.sources);
    need(w, 'missions', [...m.relations.map((r) => r.to), ...m.agreements.map((r) => r.with), ...m.disagreements.map((r) => r.with)]);
    need(w, 'people', [...m.keyPeople.map((p) => p.personId), ...m.journeys.flatMap((j) => j.personIds)]);
  }
  for (const m of db.indiaMissions) {
    const w = `${originOf('indiaMissions', m.id)} india:${m.id}`;
    need(w, 'missions', m.movementIds); need(w, 'sources', m.sources); need(w, 'people', m.people.map((p) => p.personId));
  }
  for (const c of db.conflicts) {
    const w = `${originOf('conflicts', c.id)} conflict:${c.id}`;
    need(w, 'conflicts', c.ledTo); need(w, 'events', c.eventIds); need(w, 'traditions', c.traditionIds); need(w, 'sources', c.sources);
    need(w, 'people', [...c.keyPeople.map((p) => p.personId), ...c.dissenters.map((d) => d.personId), ...c.campaigns.flatMap((j) => j.personIds)]);
  }
  for (const f of db.fathers) {
    const w = `${originOf('fathers', f.id)} father:${f.id}`;
    need(w, 'people', [f.personId]); need(w, 'fathers', f.teachers); need(w, 'sources', f.sources);
    need(w, 'works', f.works.map((x) => x.workId)); need(w, 'doctrines', f.doctrineContributions.map((x) => x.doctrineId));
  }
  for (const p of db.influences) {
    const w = `${originOf('influences', p.id)} influence:${p.id}`;
    need(w, 'fathers', [...p.fatherIds, ...p.defenders.map((d) => d.fatherId), ...p.critics.map((d) => d.fatherId)]);
    need(w, 'people', [...p.defenders.map((d) => d.personId), ...p.critics.map((d) => d.personId)]);
    need(w, 'traditions', p.traditionIds); need(w, 'influences', p.relatedIds); need(w, 'sources', p.sources);
  }
  for (const d of db.denomProfiles) {
    const w = `${originOf('denomProfiles', d.id)} denomProfile:${d.id}`;
    need(w, 'traditions', [d.id, ...d.influencedBy.map((x) => x.traditionId), ...d.influenced.map((x) => x.traditionId)]);
    need(w, 'people', d.keyFigures.map((x) => x.personId)); need(w, 'sources', d.sources);
  }
  for (const f of db.familyProfiles) need(`${originOf('familyProfiles', f.id)} family:${f.id}`, 'sources', f.sources);
  for (const f of db.denomFacts) need(`${originOf('denomFacts', f.id)} fact:${f.id}`, 'sources', f.sources);
  db.denomFacts.sort((a, b) => a.order - b.order);
  db.fathers.sort((a, b) => (a.born ?? a.died ?? 0) - (b.born ?? b.died ?? 0));
  db.influences.sort((a, b) => a.startYear - b.startYear);
  db.conflicts.sort((a, b) => a.startYear - b.startYear);
  db.missions.sort((a, b) => a.startYear - b.startYear);
  db.indiaMissions.sort((a, b) => a.order - b.order);

  // Soft checks.
  for (const e of db.events) if (e.sources.length === 0) warnings.push(`event:${e.id} has no sources`);
}

/** Era containing a year (falls back to nearest). */
export function eraForYear(eras: Era[], year: number): Era | undefined {
  return eras.find((e) => year >= e.startYear && year < e.endYear) ?? (year < (eras[0]?.startYear ?? 0) ? eras[0] : eras[eras.length - 1]);
}
