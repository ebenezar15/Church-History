/** Which string fields of the atlas are human-readable text (and so translated). */
const SKIP = new Set([
  'id', 'ref', 'kind', 'category', 'regions', 'region', 'phenomena', 'family', 'standing', 'confidence', 'icon',
  'colour', 'url', 'fullTextUrl', 'portrait', 'sources', 'genre', 'type', 'architectureDiagram', 'citation',
  'translation', 'from', 'to', 'with', 'stream', 'status', 'route', 'source', 'author', 'primarySource', 'influencedBy',
]);
const skipKey = (coll: string, key: string) =>
  SKIP.has(key) || /Ids?$/.test(key) || (coll === 'cultures' && key === 'topic');

export function* translatableEntries(coll: string, entity: { id: string }): Generator<[string, string]> {
  if (coll === 'sources') return;
  function* walk(v: unknown, path: string, key: string): Generator<[string, string]> {
    if (typeof v === 'string') {
      if (v.trim() && /[A-Za-z]/.test(v)) yield [path, v];
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) yield* walk(v[i], `${path}/${i}`, key);
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) if (!skipKey(coll, k)) yield* walk(x, `${path}/${k}`, k);
    }
  }
  for (const [k, x] of Object.entries(entity)) if (!skipKey(coll, k)) yield* walk(x, `${coll}/${entity.id}/${k}`, k);
}

export { applyTranslations } from '../src/i18n/apply.ts';
