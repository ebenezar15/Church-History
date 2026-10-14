import { buildDb } from '../src/data/build.ts';
import { loadContentFiles } from './load-files.ts';

// Usage: npm run validate [-- --only <path-substring>] [--all]
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : undefined;

const files = loadContentFiles();
const { db, errors: allErrors, warnings } = buildDb(files);
const errors = only ? allErrors.filter((e) => e.includes(only)) : allErrors;

const counts = Object.entries(db).map(([k, v]) => `${k}: ${(v as unknown[]).length}`).join(', ');
console.log(`Loaded ${Object.keys(files).length} packs — ${counts}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, process.argv.includes('--all') ? undefined : 30)) console.log('  ⚠ ' + w);
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} content error(s)${only ? ` in ${only}` : ''}:`);
  for (const e of errors) console.error('  ✖ ' + e);
  process.exit(1);
}
console.log(`\n✔ Content valid${only ? ` (${only})` : ''}`);
