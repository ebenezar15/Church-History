/** Interface dictionary lookups shared by the Tamil runtime and the offline guide. */
import dict from '../generated/ui-strings.json';
import { isTA } from './lang';

export { isTA } from './lang';
const D = dict as Record<string, string>;
const lower = new Map(Object.entries(D).map(([k, v]) => [k.toLowerCase(), v]));
/** Tamil for a whole interface label when Tamil is on, or the label unchanged. */
export const ui = (s: string) => (isTA() ? D[s] ?? lower.get(s.toLowerCase()) ?? s : s);
/** The two-language helper used in composed text. */
export const t = (en: string, ta: string) => (isTA() ? ta : en);
