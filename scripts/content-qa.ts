/**
 * npm run qa — lists entities missing sources, orphaned ids, eras with no
 * non-Western entries, positions missing objections, and other thin content.
 */
import { buildDb, eraForYear } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';

const { db, errors } = buildDb(loadContentFiles());
const WEST = new Set(['italy', 'western-europe', 'northern-europe', 'north-america']);
let issues = 0;
const report = (title: string, items: string[]) => {
  if (!items.length) { console.log(`✔ ${title}`); return; }
  issues += items.length;
  console.log(`\n✖ ${title} (${items.length})`);
  for (const i of items.slice(0, 40)) console.log('   • ' + i);
  if (items.length > 40) console.log(`   … and ${items.length - 40} more`);
};

report('Broken references / schema errors', errors);
report('Entities missing sources', [
  ...db.events.filter((x) => !x.sources.length).map((x) => `event:${x.id}`),
  ...db.people.filter((x) => !x.sources.length).map((x) => `person:${x.id}`),
  ...db.positions.filter((x) => !x.sources.length).map((x) => `position:${x.id}`),
  ...db.experiences.filter((x) => !x.sources.length).map((x) => `experience:${x.id}`),
  ...db.traditions.filter((x) => !x.sources.length).map((x) => `tradition:${x.id}`),
  ...db.doctrines.filter((x) => !x.sources.length).map((x) => `doctrine:${x.id}`),
]);

// Orphans: entities nothing links to.
const linked = new Set<string>();
const scan = (v: unknown) => {
  if (typeof v === 'string') linked.add(v);
  else if (Array.isArray(v)) v.forEach(scan);
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (k !== 'id') scan(x); });
};
scan(db);
for (const w of db.works) if (w.authorId) linked.add(w.id); // works reachable from their author
report('Orphaned people (not referenced anywhere)', db.people.filter((p) => !linked.has(p.id) && !db.works.some((w) => w.authorId === p.id) && !db.quotes.some((q) => q.personId === p.id)).map((p) => p.id));
report('Orphaned sources (never cited)', db.sources.filter((s) => !linked.has(s.id)).map((s) => s.id));

report('Eras with no non-Western events', db.eras.filter((e) => !db.events.some((x) => eraForYear(db.eras, x.year)?.id === e.id && x.regions.some((r) => !WEST.has(r)))).map((e) => e.id));
report('Eras with fewer than 4 global notes', db.eras.filter((e) => e.globalNotes.length < 4).map((e) => e.id));
report('Eras without a Life in the Church panel', db.eras.filter((e) => !db.cultures.some((c) => c.eraId === e.id)).map((e) => e.id));
report('Positions missing objections', db.positions.filter((p) => !p.strongestObjections.length).map((p) => p.id));
report('Positions missing responses to objections', db.positions.filter((p) => !p.responses.length).map((p) => p.id));
report('Positions with no proponents', db.positions.filter((p) => !p.proponentIds.length && !p.proponentsOther.length).map((p) => p.id));
report('Doctrines with no debates', db.doctrines.filter((d) => !db.controversies.some((c) => c.doctrineIds.includes(d.id))).map((d) => d.id));
report('Doctrine flows missing a node kind', db.doctrines.flatMap((d) => {
  const kinds = new Set(d.flow.nodes.map((n) => n.kind));
  const missing = ['question', 'scripture', 'voice', 'position', 'argument', 'decision', 'consequence', 'modern'].filter((k) => !kinds.has(k as never));
  return missing.length ? [`${d.id}: ${missing.join(', ')}`] : [];
}));
report('Living traditions without an adherent figure', db.traditions.filter((t) => !t.endYear && !t.adherents).map((t) => t.id));
report('Long quotations from likely-modern authors (check copyright; should be paraphrase)', db.quotes.filter((q) => q.kind === 'quotation' && (q.year ?? 0) > 1929 && q.text.split(/\s+/).length > 15).map((q) => q.id));

console.log(`\n${issues ? `${issues} issue(s) found.` : 'No issues found.'}`);
