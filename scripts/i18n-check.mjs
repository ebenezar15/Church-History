// Checks a translated chunk: node scripts/i18n-check.mjs <chunk>  (e.g. people-03)
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../i18n/', import.meta.url).pathname;
const name = process.argv[2];
const en = JSON.parse(readFileSync(`${root}en/${name}.json`, 'utf8'));
const ta = {};
const files = readdirSync(`${root}ta`).filter((f) => f === `${name}.json` || new RegExp(`^${name}\\.p\\d+\\.json$`).test(f));
if (!files.length) { console.log(`✖ ${name}: no output file`); process.exit(1); }
for (const f of files) {
  try { Object.assign(ta, JSON.parse(readFileSync(`${root}ta/${f}`, 'utf8'))); } catch (e) { console.log(`✖ ${f}: invalid JSON: ${e.message}`); process.exit(1); }
}
const missing = Object.keys(en).filter((k) => typeof ta[k] !== 'string' || !ta[k].trim());
const untranslated = Object.keys(en).filter((k) => ta[k] && en[k].length > 25 && !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(en[k]) && !/[஀-௿]/.test(ta[k]));
const short = Object.keys(en).filter((k) => ta[k] && en[k].length > 400 && ta[k].length < en[k].length * 0.6);
const extra = Object.keys(ta).filter((k) => !(k in en));
if (missing.length || untranslated.length || extra.length || short.length) {
  console.log(`✖ ${name}: ${missing.length} missing, ${untranslated.length} untranslated, ${short.length} suspiciously short, ${extra.length} unknown keys`);
  for (const k of [...missing, ...untranslated, ...short, ...extra].slice(0, 15)) console.log('  ', k);
  process.exit(1);
}
console.log(`✔ ${name}: ${Object.keys(en).length} entries OK`);
