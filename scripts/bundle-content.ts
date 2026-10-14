/**
 * Merges and validates every content pack once, at build time, and writes the result to
 * src/generated/atlas-db.json. The app loads that file directly, so browsers skip the
 * schema checks (much faster first load on phones). Fails on any content error.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';

const { db, errors } = buildDb(loadContentFiles());
if (errors.length) {
  console.error(`✖ ${errors.length} content error(s); run npm run validate`);
  process.exit(1);
}
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/atlas-db.json', JSON.stringify(db));
console.log(`✔ wrote src/generated/atlas-db.json (${Object.entries(db).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ')})`);
