// Builds i18n/glossary.tsv ("English<TAB>Tamil" per line) from the translated glossary parts, for translators to grep.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const en = {}; for (const f of readdirSync('i18n/glossary-en')) Object.assign(en, JSON.parse(readFileSync('i18n/glossary-en/' + f, 'utf8')));
const ta = {}; for (const f of readdirSync('i18n/ta')) if (f.startsWith('glossary-')) Object.assign(ta, JSON.parse(readFileSync('i18n/ta/' + f, 'utf8')));
const lines = Object.keys(ta).filter((k) => en[k]).map((k) => `${en[k]}\t${ta[k]}`);
writeFileSync('i18n/glossary.tsv', lines.join('\n') + '\n');
console.log(lines.length, 'glossary lines');
