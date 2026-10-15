/**
 * Extracts every translatable string from the merged atlas into i18n/en/*.json chunks of
 * { "<collection>/<entityId>/<field path>": "English" }. Translators return the same keys in
 * i18n/ta/*.json; scripts/bundle-content.ts overlays them when LANG=ta.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';
import { translatableEntries } from './i18n-fields.ts';

const { db } = buildDb(loadContentFiles());
const CHUNK = Number(process.env.CHUNK ?? 24000);
rmSync('i18n/en', { recursive: true, force: true });
mkdirSync('i18n/en', { recursive: true });
let total = 0;
let files = 0;
for (const [coll, list] of Object.entries(db)) {
  let part: Record<string, string> = {};
  let size = 0;
  let n = 0;
  const flush = () => {
    if (!size) return;
    writeFileSync(`i18n/en/${coll}-${String(n++).padStart(2, '0')}.json`, JSON.stringify(part, null, 1));
    files++;
    part = {};
    size = 0;
  };
  for (const e of list as { id: string }[]) {
    for (const [k, v] of translatableEntries(coll, e)) {
      part[k] = v;
      size += v.length;
      total += v.length;
    }
    if (size >= CHUNK) flush();
  }
  flush();
}
console.log(`✔ ${files} chunks, ${total.toLocaleString()} characters of English`);
