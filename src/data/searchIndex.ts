import Fuse from 'fuse.js';
import type { Atlas } from './db';
import type { EntityType } from './schema';
import { formatYear } from './families';

export interface SearchDoc { type: EntityType; id: string; title: string; sub: string; text: string }

let cache: { atlas: Atlas; fuse: Fuse<SearchDoc> } | undefined;
export function getFuse(a: Atlas) {
  if (cache?.atlas === a) return cache.fuse;
  const docs: SearchDoc[] = [
    ...a.eras.map((e) => ({ type: 'era' as const, id: e.id, title: e.name, sub: `${formatYear(e.startYear)}–${formatYear(e.endYear)}`, text: e.summary })),
    ...a.events.map((e) => ({ type: 'event' as const, id: e.id, title: e.title, sub: formatYear(e.year, e.circa), text: e.summary })),
    ...a.people.map((p) => ({ type: 'person' as const, id: p.id, title: p.name, sub: p.roles.slice(0, 2).join(', '), text: p.summary })),
    ...a.works.map((w) => ({ type: 'work' as const, id: w.id, title: w.title, sub: `${w.author ?? a.get<{ name: string }>('person', w.authorId ?? '')?.name ?? ''} · ${formatYear(w.year, w.circa)}`, text: w.summary })),
    ...a.quotes.map((q) => ({ type: 'quote' as const, id: q.id, title: q.text.slice(0, 90), sub: a.get<{ name: string }>('person', q.personId)?.name ?? '', text: q.topics.join(' ') })),
    ...a.doctrines.map((d) => ({ type: 'doctrine' as const, id: d.id, title: d.name, sub: d.question, text: d.summary })),
    ...a.positions.map((p) => ({ type: 'position' as const, id: p.id, title: p.name, sub: [a.doctrinesByPosition.get(p.id)?.name, ...p.altNames].filter(Boolean).join(' · '), text: p.oneLine })),
    ...a.traditions.map((t) => ({ type: 'tradition' as const, id: t.id, title: t.name, sub: `from ${formatYear(t.foundedYear)}`, text: t.summary })),
    ...a.controversies.map((c) => ({ type: 'controversy' as const, id: c.id, title: c.title, sub: c.question, text: c.summary })),
    ...a.experiences.map((x) => ({ type: 'experience' as const, id: x.id, title: x.title, sub: `${x.place.name} · ${formatYear(x.year, x.circa)}`, text: x.account })),
    ...a.comparisons.map((c) => ({ type: 'comparison' as const, id: c.id, title: c.title, sub: 'Featured comparison', text: c.summary })),
    ...a.paths.map((p) => ({ type: 'path' as const, id: p.id, title: p.title, sub: 'Study path', text: p.summary })),
    ...a.missions.map((m) => ({ type: 'mission' as const, id: m.id, title: m.name, sub: formatYear(m.startYear), text: `${m.summary} ${m.keyPeople.map((p) => p.name).join(' ')}` })),
    ...a.fathers.map((f) => ({ type: 'father' as const, id: f.id, title: f.name, sub: `${formatYear(f.died ?? f.born ?? 0)} · ${f.see.name}`, text: f.summary })),
    ...a.influences.map((p) => ({ type: 'influence' as const, id: p.id, title: p.name, sub: `${p.sourceCulture} → ${p.christianForm}`, text: `${p.summary} ${p.popularClaim}` })),
    ...a.conflicts.map((c) => ({ type: 'conflict' as const, id: c.id, title: c.name, sub: `${formatYear(c.startYear)} · ${c.region}`, text: `${c.summary} ${c.keyPeople.map((p) => p.name).join(' ')}` })),
    ...a.indiaMissions.map((m) => ({ type: 'india' as const, id: m.id, title: m.title, sub: `${formatYear(m.startYear)} · ${m.region}`, text: `${m.summary} ${m.people.map((p) => p.name).join(' ')}` })),
  ];
  const fuse = new Fuse(docs, {
    keys: [{ name: 'title', weight: 3 }, { name: 'sub', weight: 1.2 }, { name: 'text', weight: 0.6 }],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  cache = { atlas: a, fuse };
  return fuse;
}
