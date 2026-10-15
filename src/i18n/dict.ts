/** Interface dictionary lookups shared by the Tamil runtime and the offline guide (empty in the English build). */
import dict from '../generated/ui-strings.json';
import namesEn from '../generated/names-en.json';

const D = dict as Record<string, string>;
const lower = new Map(Object.entries(D).map(([k, v]) => [k.toLowerCase(), v]));
export const LANG: 'en' | 'ta' =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_LANG ?? (globalThis as { process?: { env: Record<string, string> } }).process?.env.VITE_LANG) === 'ta' ? 'ta' : 'en';
export const TA = LANG === 'ta';
/** Tamil for a whole interface label, or the label unchanged. */
export const ui = (s: string) => D[s] ?? lower.get(s.toLowerCase()) ?? s;
/** The two-language helper used in composed text. */
export const t = (en: string, ta: string) => (TA ? ta : en);
/** English names of entries ("person/augustine" → "Augustine of Hippo"); only shipped in translated builds. */
export const ENGLISH_NAMES = namesEn as Record<string, string>;
