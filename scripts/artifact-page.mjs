// Turns dist-single/index.html into a page fragment for claude.ai Artifacts (the host supplies
// <html>/<head>/<body> and the charset/viewport metas). Usage: npm run build:artifact
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
let head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
head = head.replace(/<meta charset="UTF-8"\s*\/?>/, '').replace(/<meta name="viewport"[^>]*>/, '').replace(/<link rel="icon"[^>]*>/, '');
const title = head.match(/<title>.*?<\/title>/)[0];
// The host rejects a literal U+FFFD; the only occurrences are inside bundled JS string literals.
const page = `${title}\n${head.replace(title, '').trim()}\n${body.trim()}\n`.replaceAll('�', '\\uFFFD');
writeFileSync('dist-single/artifact.html', page);
console.log(`dist-single/artifact.html (${(page.length / 1e6).toFixed(1)} MB)`);
