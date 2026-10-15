/** Writes translated strings into a content database (mutates). Keys look like "people/augustine/summary". */
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
