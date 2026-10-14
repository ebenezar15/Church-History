/**
 * Tools that let Claude read the atlas. Shared by the in-app "Ask the Atlas" chat and the `npm run ask` CLI.
 * Every tool is read-only and returns compact JSON so answers stay grounded in the atlas's own sourced entries.
 */
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Atlas } from '../data/db';
import { TYPE_TO_KEY } from '../data/build';
import { EntityType, type Controversy, type Doctrine, type Event, type Person, type Position, type Tradition, type Work } from '../data/schema';
import { getFuse } from '../data/searchIndex';

export type ToolEvent = { tool: string; summary: string };

const json = (v: unknown) => JSON.stringify(v, null, 0);

function sourceTitles(a: Atlas, ids: string[]) {
  return ids.map((id) => a.sources.find((s) => s.id === id)).filter(Boolean).map((s) => `${s!.author ? s!.author + ', ' : ''}${s!.title}${s!.year ? ` (${s!.year})` : ''}`);
}

/** A compact, citation-friendly view of one entry plus its most useful relations. */
export function describeEntry(a: Atlas, type: EntityType, id: string): Record<string, unknown> | null {
  const e = a.get<Record<string, unknown>>(type, id);
  if (!e) return null;
  const base: Record<string, unknown> = { ...e, type, link: `entity:${type}/${id}` };
  if (Array.isArray(e.sources)) base.sources = sourceTitles(a, e.sources as string[]);
  switch (type) {
    case 'doctrine': {
      const d = e as unknown as Doctrine;
      base.flow = d.flow.nodes.map((n) => ({ kind: n.kind, label: n.label, year: n.year, text: n.text, ref: n.ref }));
      base.positions = (a.positionsByDoctrine.get(id) ?? []).map((p) => ({ id: p.id, name: p.name, oneLine: p.oneLine, standing: p.standing }));
      base.debates = (a.controversiesByDoctrine.get(id) ?? []).map((c) => ({ id: c.id, title: c.title }));
      break;
    }
    case 'person': {
      const p = e as unknown as Person;
      base.quotes = (a.quotesByPerson.get(id) ?? []).map((q) => ({ text: q.text, kind: q.kind, citation: q.citation }));
      base.works = (a.worksByAuthor.get(id) ?? []).map((w) => ({ id: w.id, title: w.title, year: w.year }));
      base.positionsChampioned = (a.positionsByPerson.get(id) ?? []).map((x) => ({ id: x.id, name: x.name }));
      base.influenced = (a.influenced.get(id) ?? []).map((x) => ({ id: x.id, name: x.name }));
      base.influencedBy = p.influencedBy.map((x) => ({ id: x, name: a.get<Person>('person', x)?.name }));
      break;
    }
    case 'tradition': {
      base.lineage = lineage(a, id);
      base.events = a.events.filter((x) => x.traditionIds.includes(id)).map((x) => ({ id: x.id, title: x.title, year: x.year }));
      break;
    }
    case 'work':
      base.quotes = (a.quotesByWork.get(id) ?? []).map((q) => ({ text: q.text, kind: q.kind, citation: q.citation }));
      base.author = (e as unknown as Work).authorId ? a.get<Person>('person', (e as unknown as Work).authorId!)?.name : (e as unknown as Work).author;
      break;
    case 'position':
      base.doctrine = a.doctrinesByPosition.get(id)?.name;
      base.proponents = (e as unknown as Position).proponentIds.map((x) => a.get<Person>('person', x)?.name ?? x);
      break;
    case 'controversy':
      base.sides = (e as unknown as Controversy).sides.map((s) => ({ ...s, quotes: s.quoteIds.map((q) => a.quotes.find((x) => x.id === q)).filter(Boolean).map((q) => ({ text: q!.text, kind: q!.kind, citation: q!.citation })) }));
      break;
    case 'event':
      base.era = a.eraOf((e as unknown as Event).year)?.name;
      base.traditionsFounded = a.traditions.filter((t) => t.splitEventId === id).map((t) => t.name);
      break;
  }
  return base;
}

export function lineage(a: Atlas, id: string) {
  const t = a.get<Tradition>('tradition', id);
  if (!t) return null;
  const ancestors: { id: string; name: string; founded: number }[] = [];
  let cur: Tradition | undefined = t;
  const seen = new Set<string>();
  while (cur && cur.parentIds[0] && !seen.has(cur.parentIds[0])) {
    seen.add(cur.parentIds[0]);
    cur = a.get<Tradition>('tradition', cur.parentIds[0]);
    if (cur) ancestors.push({ id: cur.id, name: cur.name, founded: cur.foundedYear });
  }
  const descend = (pid: string, depth: number): unknown[] =>
    depth > 3 ? [] : (a.childrenOf.get(pid) ?? []).map((c) => ({ id: c.id, name: c.name, founded: c.foundedYear, children: descend(c.id, depth + 1) }));
  return {
    name: t.name,
    otherParents: t.parentIds.slice(1).map((p) => a.get<Tradition>('tradition', p)?.name ?? p),
    ancestorsNearestFirst: ancestors,
    splitEvent: t.splitEventId ? { id: t.splitEventId, title: a.get<Event>('event', t.splitEventId)?.title } : null,
    descendants: descend(id, 0),
  };
}

export function createAtlasTools(a: Atlas, onEvent?: (e: ToolEvent) => void) {
  const say = (tool: string, summary: string) => onEvent?.({ tool, summary });

  const searchAtlas = betaZodTool({
    name: 'search_atlas',
    description:
      'Full-text search across every atlas entry: eras, events, people, writings, quotes, doctrines, doctrinal positions, traditions/denominations, debates, experiences, comparisons and study paths. Returns the best matches with ids. Use this first to find the entries relevant to the question; try several phrasings or names if the first search is thin.',
    inputSchema: z.object({
      query: z.string().describe('Words to search for, e.g. "Nicaea", "penal substitution", "Ethiopian church"'),
      types: z.array(EntityType).optional().describe('Restrict to these entry types'),
      limit: z.number().int().min(1).max(25).optional(),
    }),
    run: async ({ query, types, limit }) => {
      say('search_atlas', `Searching the atlas for “${query}”`);
      const hits = getFuse(a)
        .search(query, { limit: 60 })
        .map((r) => r.item)
        .filter((d) => !types?.length || types.includes(d.type))
        .slice(0, limit ?? 10)
        .map((d) => ({ type: d.type, id: d.id, title: d.title, detail: d.sub, snippet: d.text.slice(0, 220) }));
      return json(hits.length ? hits : { message: 'No matches. Try a different spelling, a person or council name, or a broader term.' });
    },
  });

  const getEntry = betaZodTool({
    name: 'get_entry',
    description:
      'Read one atlas entry in full by type and id (ids come from search_atlas or other tools). Includes its sources and key relations: a doctrine’s flowchart, positions and debates; a person’s quotes, writings and influences; a tradition’s lineage; a debate’s sides in their own voice.',
    inputSchema: z.object({ type: EntityType, id: z.string() }),
    run: async ({ type, id }) => {
      const r = describeEntry(a, type, id);
      say('get_entry', `Reading ${(r?.name ?? r?.title ?? id) as string}`);
      return json(r ?? { error: `No ${type} with id "${id}". Use search_atlas to find the right id.` });
    },
  });

  const listPositions = betaZodTool({
    name: 'list_doctrine_positions',
    description: 'List every position (view) the atlas records within one doctrine, with one-line summaries, origin year and which traditions hold it. Call with no doctrineId to list all doctrines.',
    inputSchema: z.object({ doctrineId: z.string().optional() }),
    run: async ({ doctrineId }) => {
      if (!doctrineId) {
        say('list_doctrine_positions', 'Listing all doctrines');
        return json(a.doctrines.map((d) => ({ id: d.id, name: d.name, question: d.question, positions: a.positionsByDoctrine.get(d.id)?.length ?? 0 })));
      }
      say('list_doctrine_positions', `Listing positions in ${a.get<Doctrine>('doctrine', doctrineId)?.name ?? doctrineId}`);
      const ps = a.positionsByDoctrine.get(doctrineId);
      if (!ps) return json({ error: `Unknown doctrine "${doctrineId}"`, doctrines: a.doctrines.map((d) => d.id) });
      return json(ps.map((p) => ({ id: p.id, name: p.name, oneLine: p.oneLine, originYear: p.originYear, standing: p.standing, heldBy: p.traditionIds.map((t) => a.get<Tradition>('tradition', t)?.name ?? t) })));
    },
  });

  const traditionTree = betaZodTool({
    name: 'tradition_lineage',
    description: 'Trace a tradition/denomination through the family tree: its ancestors back to the early church, the event that caused its split, and its descendant branches. Call with no id to get the whole tree as a compact outline.',
    inputSchema: z.object({ id: z.string().optional() }),
    run: async ({ id }) => {
      if (!id) {
        say('tradition_lineage', 'Reading the whole family tree');
        return json(a.traditions.map((t) => ({ id: t.id, name: t.name, family: t.family, parents: t.parentIds, founded: t.foundedYear, ended: t.endYear })));
      }
      const r = lineage(a, id);
      say('tradition_lineage', `Tracing the lineage of ${r?.name ?? id}`);
      return json(r ?? { error: `Unknown tradition "${id}". Use search_atlas with types ["tradition"].` });
    },
  });

  const eventsBetween = betaZodTool({
    name: 'events_between',
    description: 'List timeline events between two years (negative = BC), optionally filtered by category or region. Use for "what happened in…" or chronology questions.',
    inputSchema: z.object({
      from: z.number().int(),
      to: z.number().int(),
      category: z.enum(['council', 'schism', 'persecution', 'mission', 'revival', 'reform', 'political', 'liturgical', 'intellectual', 'experiential']).optional(),
      region: z.string().optional().describe('Region id such as "east-asia", "ethiopia-nubia", "latin-america"'),
    }),
    run: async ({ from, to, category, region }) => {
      say('events_between', `Checking the timeline ${from}–${to}`);
      const evs = a.events
        .filter((e) => e.year >= from && e.year <= to && (!category || e.category === category) && (!region || e.regions.includes(region as never)))
        .slice(0, 60)
        .map((e) => ({ id: e.id, year: e.year, circa: e.circa, title: e.title, category: e.category, place: e.place?.name, summary: e.summary }));
      return json(evs);
    },
  });

  return [searchAtlas, getEntry, listPositions, traditionTree, eventsBetween];
}

export const SYSTEM_PROMPT = `You are the guide to Ecclesia Atlas, an atlas of two thousand years of Christian history, doctrine, denominations and spiritual experience. You answer questions the way a fair-minded church historian would.

How to answer:
- Ground your answer in the atlas. Search it, read the relevant entries, and build the answer from what they say. Use several tool calls when a question spans people, events and doctrines.
- Link every atlas entry you rely on, using the markdown form [label](entity:TYPE/ID) with the type and id the tools returned, e.g. [Council of Nicaea](entity:event/council-of-nicaea-325). Only link ids you have actually seen in tool results.
- If the atlas does not cover something, say so plainly and, if you add background from general knowledge, label it as such.
- On contested questions, present each tradition's position in its own best terms first, then the main objections from others. Never declare one tradition or view correct. Distinguish established fact, scholarly debate and tradition or legend, as the entries' confidence fields do.
- Quote only text that appears in the atlas's quotes, and keep the "paraphrase" label where an entry has one.
- Write clear prose for a curious reader: short paragraphs, bullets where they help, no headings for short answers. Keep it focused; offer to go deeper rather than writing everything at once.`;

export const ENTRY_TYPES = Object.keys(TYPE_TO_KEY) as EntityType[];
