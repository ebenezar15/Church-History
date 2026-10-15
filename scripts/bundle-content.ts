/**
 * Merges and validates every content pack once, at build time, and writes the result to
 * src/generated/atlas-db.json. The app loads that file directly, so browsers skip the
 * schema checks (much faster first load on phones). Fails on any content error.
 *
 * It also packs the Tamil edition: the translated text from i18n/ta (content chunks first, then
 * the name glossary so names stay consistent) as a gzipped overlay that the app unpacks only when
 * someone switches to Tamil, plus the interface dictionary in src/generated/ui-strings.json.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';
import { translatableEntries } from './i18n-fields.ts';

const { db, errors } = buildDb(loadContentFiles());
if (errors.length) {
  console.error(`✖ ${errors.length} content error(s); run npm run validate`);
  process.exit(1);
}
const dir = 'i18n/ta';
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
const read = (f: string) => {
  try {
    return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Record<string, string>;
  } catch (e) {
    console.warn(`⚠ skipping ${f}: ${e}`);
    return {};
  }
};
const content: Record<string, string> = {};
const ui: Record<string, string> = {};
for (const f of files.filter((f) => !/^(ui|glossary)/.test(f))) Object.assign(content, read(f));
for (const f of files.filter((f) => f.startsWith('glossary'))) Object.assign(content, read(f));
for (const f of files.filter((f) => f.startsWith('ui'))) Object.assign(ui, read(f));
// Only text fields are overlaid (never ids or links), whatever a translation file contains.
const allowed = new Set<string>();
for (const [coll, list] of Object.entries(db)) for (const e of list as { id: string }[]) for (const [k] of translatableEntries(coll, e)) allowed.add(k);
for (const k of Object.keys(content)) if (!allowed.has(k) || !content[k]?.trim()) delete content[k];
for (const k of Object.keys(ui)) if (!ui[k] || ui[k] === k) delete ui[k];

mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/atlas-db.json', JSON.stringify(db));
writeFileSync('src/generated/ui-strings.json', JSON.stringify(ui));
const packed = gzipSync(JSON.stringify(content), { level: 9 }).toString('base64');
writeFileSync('src/generated/ta-overlay.txt', packed);
console.log(`✔ wrote src/generated/atlas-db.json (${Object.entries(db).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ')})`);
console.log(`✔ Tamil: ${Object.keys(content).length.toLocaleString()} translated fields (${(packed.length / 1e6).toFixed(1)} MB packed), ${Object.keys(ui).length} interface strings`);
