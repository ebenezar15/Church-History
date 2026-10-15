/**
 * Merges and validates every content pack once, at build time, and writes the result to
 * src/generated/atlas-db.json. The app loads that file directly, so browsers skip the
 * schema checks (much faster first load on phones). Fails on any content error.
 *
 * With ATLAS_LANG=ta the Tamil translations in i18n/ta are laid over the English text
 * (content chunks first, then the name glossary so names stay consistent everywhere), and
 * the UI dictionary is written to src/generated/ui-strings.json.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';
import { applyTranslations } from './i18n-fields.ts';

const { db, errors } = buildDb(loadContentFiles());
if (errors.length) {
  console.error(`✖ ${errors.length} content error(s); run npm run validate`);
  process.exit(1);
}
const lang = process.env.ATLAS_LANG ?? 'en';
const ui: Record<string, string> = {};
const namesEn: Record<string, string> = {};
if (lang !== 'en') {
  const dir = `i18n/${lang}`;
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
  for (const f of files.filter((f) => !/^(ui|glossary)/.test(f))) Object.assign(content, read(f));
  for (const f of files.filter((f) => f.startsWith('glossary'))) Object.assign(content, read(f));
  for (const f of files.filter((f) => f.startsWith('ui'))) Object.assign(ui, read(f));
  // English names stay searchable in the translated edition (so "Augustine" still finds அகஸ்டின்).
  const TYPE: Record<string, string> = { doctrines: 'doctrine', traditions: 'tradition', people: 'person', positions: 'position', events: 'event', controversies: 'controversy', experiences: 'experience', works: 'work', eras: 'era' };
  for (const [coll, type] of Object.entries(TYPE)) for (const e of (db as unknown as Record<string, Record<string, string>[]>)[coll]) namesEn[`${type}/${e.id}`] = e.name ?? e.title;
  const n = applyTranslations(db as unknown as Record<string, { id: string }[]>, content);
  console.log(`✔ applied ${n.toLocaleString()} ${lang} translations, ${Object.keys(ui).length} UI strings`);
}
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/atlas-db.json', JSON.stringify(db));
writeFileSync('src/generated/ui-strings.json', JSON.stringify(ui));
writeFileSync('src/generated/names-en.json', JSON.stringify(namesEn));
console.log(`✔ wrote src/generated/atlas-db.json (${Object.entries(db).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ')})`);
