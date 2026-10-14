/**
 * Ask the Atlas from the command line.
 *
 *   npm run ask -- "Why did the Church of the East separate after Ephesus?"   # one question
 *   npm run ask                                                               # interactive chat
 *   npm run ask -- --claude "…"              # use Claude instead of the offline guide (needs ANTHROPIC_API_KEY)
 *   npm run ask -- --claude --model claude-sonnet-5-5 "…"
 *
 * By default it answers with the built-in offline guide: no network, account or key.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createInterface } from 'node:readline/promises';
import { buildDb } from '../src/data/build.ts';
import { createAtlas } from '../src/data/db.ts';
import { askAtlas, DEFAULT_MODEL, type Turn } from '../src/agent/run.ts';
import { answerOffline, type Ref } from '../src/agent/offline.ts';
import { loadContentFiles } from './load-files.ts';

const args = process.argv.slice(2);
const mi = args.indexOf('--model');
const model = mi > -1 ? args.splice(mi, 2)[1] : DEFAULT_MODEL;
const ci = args.indexOf('--claude');
const useClaude = ci > -1;
if (useClaude) args.splice(ci, 1);
const oneShot = args.join(' ').trim();

const { db, errors } = buildDb(loadContentFiles());
if (errors.length) console.warn(`(content has ${errors.length} validation errors — run npm run validate)`);
const atlas = createAtlas(db);
const client = useClaude ? new Anthropic() : null;
let focus: Ref | undefined;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
// Render atlas links as "label [type/id]" in the terminal.
const plain = (s: string) => s.replace(/\[([^\]]+)\]\(entity:([a-z]+)\/([a-z0-9-]+)\)/g, '$1 [$2/$3]');

async function turn(question: string, history: Turn[]) {
  if (!client) {
    const r = answerOffline(atlas, question, focus);
    focus = r.focus ?? focus;
    for (const s of r.steps) console.log(dim(`  · ${s}`));
    console.log('\n' + plain(r.text) + '\n');
    return;
  }
  try {
    const r = await askAtlas({ client, atlas, history, question, model, onEvent: (e) => console.log(dim(`  · ${e.summary}`)) });
    if (r.refused) console.log('The model declined to answer this question.');
    console.log('\n' + plain(r.text) + '\n');
    history.push({ role: 'user', text: question }, { role: 'assistant', text: r.text });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error('Authentication failed: set ANTHROPIC_API_KEY or run `ant auth login`.');
    else if (err instanceof Anthropic.RateLimitError) console.error('Rate limited — wait a moment and try again.');
    else if (err instanceof Anthropic.APIError) console.error(`API error ${err.status}: ${err.message}`);
    else throw err;
  }
}

const history: Turn[] = [];
if (oneShot) {
  await turn(oneShot, history);
} else {
  console.log(`Ecclesia Atlas — ask anything about Church history, doctrine or denominations (${client ? model : 'offline guide'}). Type help for examples; Ctrl+C to quit.\n`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) {
    const q = (await rl.question('? ')).trim();
    if (q) await turn(q, history);
  }
}
