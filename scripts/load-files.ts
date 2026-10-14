import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Reads every /content/**\/*.json file into { '/content/x.json': parsed }. */
export function loadContentFiles(root = join(import.meta.dirname, '..', 'content')): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json')) {
        const key = '/content/' + relative(root, p).split('\\').join('/');
        try {
          out[key] = JSON.parse(readFileSync(p, 'utf8'));
        } catch (e) {
          out[key] = { __parseError: String(e) };
        }
      }
    }
  };
  walk(root);
  return out;
}
