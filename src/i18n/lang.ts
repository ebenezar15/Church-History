/**
 * The current language (English or Tamil). It can change at runtime from the header switch; the
 * choice is remembered on this device and can be forced with ?lang=ta / ?lang=en in the address.
 */
export type Lang = 'en' | 'ta';
const KEY = 'ecclesia-lang';

function initial(): Lang {
  const env = (import.meta as { env?: Record<string, string> }).env?.VITE_LANG ?? (globalThis as { process?: { env: Record<string, string> } }).process?.env.VITE_LANG;
  if (env === 'ta' || env === 'en') return env;
  try {
    const m = /[?&]lang=(en|ta)\b/.exec(window.location.search + window.location.hash);
    if (m) return m[1] as Lang;
  } catch { /* no window (Node) */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'ta' || s === 'en') return s;
  } catch { /* storage blocked */ }
  return 'en';
}

let current: Lang = initial();
const subs = new Set<(l: Lang) => void>();

export const getLang = () => current;
export const isTA = () => current === 'ta';
export function setLang(l: Lang) {
  if (l === current) return;
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  subs.forEach((f) => f(l));
}
export function onLang(f: (l: Lang) => void) {
  subs.add(f);
  return () => { subs.delete(f); };
}
