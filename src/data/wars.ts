/** Display metadata for the Wars & Conflicts section (labels in English and Tamil). */
import type { IconName } from '../components/Icon';
import type { Conflict } from './schema';
import { isTA } from '../i18n/lang';

type Kind = Conflict['kind'];
type Role = Conflict['religionRole'];

export const KIND_META: Record<Kind, { en: string; ta: string; colour: string; icon: IconName }> = {
  crusade: { en: 'Crusade', ta: 'சிலுவைப் போர்', colour: '#c0392b', icon: 'cross' },
  'holy-war': { en: 'Holy war', ta: 'புனிதப் போர்', colour: '#b8892b', icon: 'flame' },
  'religious-war': { en: 'War of religion', ta: 'மதப் போர்', colour: '#7a4fc2', icon: 'split' },
  'conquest-conversion': { en: 'Conquest & forced conversion', ta: 'படையெடுப்பும் கட்டாய மதமாற்றமும்', colour: '#a0522d', icon: 'crown' },
  rebellion: { en: 'Religious rebellion', ta: 'மதக் கிளர்ச்சி', colour: '#d07a1e', icon: 'flame' },
  sectarian: { en: 'Sectarian conflict', ta: 'பிரிவினைவாத மோதல்', colour: '#2a8fb8', icon: 'scales' },
  'anti-christian': { en: 'Anti-Christian violence', ta: 'கிறிஸ்தவ எதிர்ப்பு வன்முறை', colour: '#555', icon: 'close' },
  complicity: { en: 'Church complicity', ta: 'திருச்சபையின் உடந்தை', colour: '#8b0000', icon: 'scales' },
};

export const ROLE_META: Record<Role, { en: string; ta: string; colour: string; level: number; note: { en: string; ta: string } }> = {
  central: { en: 'Central', ta: 'மையமானது', colour: '#c0392b', level: 4, note: { en: 'religion was the main stated and real cause', ta: 'மதமே முதன்மையான, உண்மையான காரணம்' } },
  major: { en: 'Major', ta: 'முக்கியமானது', colour: '#d07a1e', level: 3, note: { en: 'religion was one of the main causes', ta: 'மதம் முக்கியக் காரணங்களில் ஒன்று' } },
  contributing: { en: 'Contributing', ta: 'துணைக் காரணம்', colour: '#b8892b', level: 2, note: { en: 'religion mixed with politics, land and identity', ta: 'அரசியல், நிலம், அடையாளத்துடன் கலந்த மதம்' } },
  pretext: { en: 'Pretext', ta: 'சாக்குப்போக்கு', colour: '#2a8fb8', level: 1, note: { en: 'religion mainly used to justify other aims', ta: 'பிற நோக்கங்களை நியாயப்படுத்த மதம் பயன்படுத்தப்பட்டது' } },
};

export const kindLabel = (k: Kind) => (isTA() ? KIND_META[k].ta : KIND_META[k].en);
export const roleLabel = (r: Role) => (isTA() ? ROLE_META[r].ta : ROLE_META[r].en);
export const roleNote = (r: Role) => (isTA() ? ROLE_META[r].note.ta : ROLE_META[r].note.en);

/** A readable casualty range ("c. 1–2 million"), or '' when no estimate is given. */
export function casualtyText(c: Conflict['casualties']) {
  const f = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} ${isTA() ? 'மில்லியன்' : 'million'}` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString()},000` : String(n));
  if (c.low && c.high && c.low !== c.high) return `${f(c.low)} – ${f(c.high)}`;
  const v = c.high ?? c.low;
  return v ? f(v) : '';
}
