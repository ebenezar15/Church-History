/**
 * Writes every translatable field that has no Tamil yet into i18n/en/<prefix>-NN.json chunks
 * (so new content can be translated without reshuffling existing chunk boundaries).
 * Usage: CHUNK=11000 npx tsx scripts/i18n-gaps.ts <prefix>
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';
import { translatableEntries } from './i18n-fields.ts';

const prefix = process.argv[2] ?? 'gap';
const CHUNK = Number(process.env.CHUNK ?? 11000);
const { db } = buildDb(loadContentFiles());
const have = new Set<string>();
for (const f of readdirSync('i18n/ta').filter((f) => f.endsWith('.json'))) {
  try { for (const k of Object.keys(JSON.parse(readFileSync(`i18n/ta/${f}`, 'utf8')))) have.add(k); } catch { /* skip broken */ }
}
let part: Record<string, string> = {};
let size = 0;
let n = 0;
let total = 0;
const flush = () => {
  if (!size) return;
  let name: string;
  do name = `i18n/en/${prefix}-${String(n++).padStart(2, '0')}.json`; while (existsSync(name));
  writeFileSync(name, JSON.stringify(part, null, 1));
  part = {}; size = 0;
};
for (const [coll, list] of Object.entries(db)) {
  for (const e of list as { id: string }[]) {
    const entries = [...translatableEntries(coll, e)].filter(([k]) => !have.has(k));
    for (const [k, v] of entries) { part[k] = v; size += v.length; total++; }
    if (size >= CHUNK) flush();
  }
}
flush();
console.log(`✔ ${total} untranslated fields in ${n} chunk(s) (${prefix}-*)`);
