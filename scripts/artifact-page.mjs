// Turns dist-single/index.html into a page fragment for claude.ai Artifacts (the host supplies
// <html>/<head>/<body> and the charset/viewport metas). Usage: node scripts/artifact-page.mjs [dir] [title]
import { readFileSync, writeFileSync } from 'node:fs';

const dir = process.argv[2] ?? 'dist-single';
const html = readFileSync(`${dir}/index.html`, 'utf8');
let head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
head = head.replace(/<meta charset="UTF-8"\s*\/?>/, '').replace(/<meta name="viewport"[^>]*>/, '').replace(/<link rel="icon"[^>]*>/, '');
let title = head.match(/<title>.*?<\/title>/)[0];
head = head.replace(title, '');
if (process.argv[3]) title = `<title>${process.argv[3]}</title>`;
// The host rejects a literal U+FFFD; the only occurrences are inside bundled JS string literals.
const page = `${title}\n${head.trim()}\n${body.trim()}\n`.replaceAll('�', '\\uFFFD');
writeFileSync(`${dir}/artifact.html`, page);
console.log(`${dir}/artifact.html (${(page.length / 1e6).toFixed(1)} MB)`);
