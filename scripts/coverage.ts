/**
 * npm run coverage — counts per era, tradition family, doctrine and region so content gaps are visible.
 */
import { buildDb, eraForYear } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';

const { db } = buildDb(loadContentFiles());
const WEST = new Set(['italy', 'western-europe', 'northern-europe', 'north-america']);
const bar = (n: number, max: number) => '█'.repeat(Math.round((n / Math.max(1, max)) * 30)).padEnd(30, '·');
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

console.log('\nECCLESIA ATLAS — CONTENT COVERAGE\n');
console.log(Object.entries(db).map(([k, v]) => `${k}: ${(v as unknown[]).length}`).join(' · '));

console.log('\n── By era ' + '─'.repeat(70));
console.log(pad('Era', 34) + pad('events', 8) + pad('non-W', 7) + pad('people', 8) + pad('works', 7) + pad('exp.', 6) + 'culture');
const rows = db.eras.map((e) => {
  const inEra = (y?: number) => y !== undefined && eraForYear(db.eras, y)?.id === e.id;
  const ev = db.events.filter((x) => inEra(x.year));
  return {
    e,
    ev: ev.length,
    nonW: ev.filter((x) => x.regions.some((r) => !WEST.has(r))).length,
    people: db.people.filter((p) => inEra(p.died ?? p.born)).length,
    works: db.works.filter((w) => inEra(w.year)).length,
    exp: db.experiences.filter((x) => inEra(x.year)).length,
    culture: db.cultures.find((c) => c.eraId === e.id)?.panels.length ?? 0,
  };
});
const maxEv = Math.max(...rows.map((r) => r.ev));
for (const r of rows) console.log(pad(r.e.name, 34) + pad(String(r.ev), 8) + pad(String(r.nonW), 7) + pad(String(r.people), 8) + pad(String(r.works), 7) + pad(String(r.exp), 6) + pad(String(r.culture), 4) + bar(r.ev, maxEv));

console.log('\n── By doctrine ' + '─'.repeat(65));
console.log(pad('Doctrine', 30) + pad('positions', 11) + pad('nodes', 7) + pad('edges', 7) + pad('debates', 9) + 'quotes');
for (const d of db.doctrines) {
  const ps = db.positions.filter((p) => p.doctrineId === d.id).length;
  console.log(pad(d.name, 30) + pad(String(ps), 11) + pad(String(d.flow.nodes.length), 7) + pad(String(d.flow.edges.length), 7) + pad(String(db.controversies.filter((c) => c.doctrineIds.includes(d.id)).length), 9) + db.quotes.filter((q) => q.doctrineIds.includes(d.id)).length);
}

console.log('\n── By tradition family ' + '─'.repeat(57));
const fams = [...new Set(db.traditions.map((t) => t.family))];
for (const f of fams) {
  const ids = new Set(db.traditions.filter((t) => t.family === f).map((t) => t.id));
  const people = db.people.filter((p) => p.traditionIds.some((t) => ids.has(t))).length;
  const events = db.events.filter((e) => e.traditionIds.some((t) => ids.has(t))).length;
  const positions = db.positions.filter((p) => p.traditionIds.some((t) => ids.has(t))).length;
  console.log(pad(f, 22) + pad(`${ids.size} traditions`, 15) + pad(`${people} people`, 13) + pad(`${events} events`, 13) + `${positions} positions`);
}

console.log('\n── By region (events + people + experiences) ' + '─'.repeat(35));
const reg = new Map<string, number>();
for (const x of [...db.events, ...db.people, ...db.experiences]) for (const r of x.regions) reg.set(r, (reg.get(r) ?? 0) + 1);
const maxR = Math.max(...reg.values());
for (const [r, n] of [...reg.entries()].sort((a, b) => b[1] - a[1])) console.log(pad(r, 22) + pad(String(n), 6) + bar(n, maxR));
console.log('');
