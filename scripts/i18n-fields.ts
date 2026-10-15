/** Which string fields of the atlas are human-readable text (and so translated). */
const SKIP = new Set([
  'id', 'ref', 'kind', 'category', 'regions', 'region', 'phenomena', 'family', 'standing', 'confidence', 'icon',
  'colour', 'url', 'fullTextUrl', 'portrait', 'sources', 'genre', 'type', 'architectureDiagram', 'citation',
  'translation', 'from', 'to', 'route', 'source', 'colour', 'author', 'primarySource',
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

/** Writes translated strings back into a db (mutates). Keys are the ones translatableEntries produced. */
export function applyTranslations(db: Record<string, { id: string }[]>, tr: Record<string, string>) {
  const index = new Map<string, Map<string, unknown>>();
  for (const [coll, list] of Object.entries(db)) index.set(coll, new Map(list.map((e) => [e.id, e])));
  let applied = 0;
  for (const [key, val] of Object.entries(tr)) {
    const [coll, id, ...rest] = key.split('/');
    let obj = index.get(coll)?.get(id) as Record<string, unknown> | undefined;
    if (!obj || typeof val !== 'string' || !val.trim()) continue;
    for (let i = 0; i < rest.length - 1 && obj; i++) obj = obj[rest[i]] as Record<string, unknown>;
    const last = rest[rest.length - 1];
    if (obj && typeof obj[last] === 'string') {
      obj[last] = val;
      applied++;
    }
  }
  return applied;
}
