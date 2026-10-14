import type { TraditionFamily } from './schema';
import type { IconName } from '../components/Icon';

/** One consistent colour + icon per tradition family, used everywhere. Never colour alone: always pair with icon/label. */
export const FAMILIES: Record<TraditionFamily, { label: string; colour: string; icon: IconName }> = {
  early: { label: 'Early Church', colour: '#b8892b', icon: 'chi-rho' },
  catholic: { label: 'Catholic', colour: '#c2453a', icon: 'keys' },
  orthodox: { label: 'Eastern Orthodox', colour: '#3a6fc2', icon: 'orthodox-cross' },
  oriental: { label: 'Oriental Orthodox', colour: '#7a4fc2', icon: 'coptic-cross' },
  'east-syriac': { label: 'Church of the East', colour: '#1f9a8a', icon: 'star' },
  lutheran: { label: 'Lutheran', colour: '#d07a1e', icon: 'rose' },
  reformed: { label: 'Reformed', colour: '#2f7d4a', icon: 'book' },
  anglican: { label: 'Anglican', colour: '#9b3f7a', icon: 'crown' },
  anabaptist: { label: 'Anabaptist', colour: '#7f8c3a', icon: 'water' },
  baptist: { label: 'Baptist', colour: '#2a8fb8', icon: 'water' },
  methodist: { label: 'Methodist & Holiness', colour: '#c23a6a', icon: 'flame' },
  pentecostal: { label: 'Pentecostal & Charismatic', colour: '#e05a2a', icon: 'dove' },
  restorationist: { label: 'Restorationist', colour: '#8a6a3a', icon: 'scroll' },
  evangelical: { label: 'Evangelical', colour: '#3a8fc2', icon: 'globe' },
  independent: { label: 'Independent & Free', colour: '#5a7a8a', icon: 'cross' },
  nontrinitarian: { label: 'Non-Nicene', colour: '#8a8a8a', icon: 'circle' },
  'heterodox-ancient': { label: 'Ancient dissenting', colour: '#6a5a4a', icon: 'hourglass' },
};

export const CATEGORY_META: Record<string, { label: string; icon: IconName; colour: string }> = {
  council: { label: 'Council', icon: 'scroll', colour: '#b8892b' },
  schism: { label: 'Schism', icon: 'split', colour: '#c2453a' },
  persecution: { label: 'Persecution', icon: 'flame', colour: '#9b2c2c' },
  mission: { label: 'Mission', icon: 'globe', colour: '#2a8fb8' },
  revival: { label: 'Revival', icon: 'dove', colour: '#e05a2a' },
  reform: { label: 'Reform', icon: 'book', colour: '#2f7d4a' },
  political: { label: 'Political', icon: 'crown', colour: '#7a4fc2' },
  liturgical: { label: 'Liturgical', icon: 'chalice', colour: '#9b3f7a' },
  intellectual: { label: 'Intellectual', icon: 'lamp', colour: '#3a6fc2' },
  experiential: { label: 'Experiential', icon: 'star', colour: '#d07a1e' },
};

export const CONFIDENCE_META = {
  established: { label: 'Established', tone: 'good', hint: 'Historical fact broadly accepted by scholars' },
  debated: { label: 'Scholarly debate', tone: 'warn', hint: 'Historians disagree or evidence is partial' },
  traditional: { label: 'Tradition / legend', tone: 'muted', hint: 'Handed down by tradition; weak or late evidence' },
  'well-documented': { label: 'Well documented', tone: 'good', hint: 'Multiple contemporary sources' },
  contested: { label: 'Contested', tone: 'warn', hint: 'Sources disagree or interpretation is disputed' },
  hagiographical: { label: 'Hagiographical', tone: 'muted', hint: 'Known mainly from later devotional accounts' },
} as const;

export const FLOW_KIND_META: Record<string, { label: string; colour: string; icon: IconName }> = {
  question: { label: 'Question', colour: '#b8892b', icon: 'question' },
  scripture: { label: 'Scripture', colour: '#2f7d4a', icon: 'book' },
  voice: { label: 'Early voice', colour: '#3a6fc2', icon: 'quill' },
  position: { label: 'Rival answer', colour: '#7a4fc2', icon: 'branch' },
  argument: { label: 'Argument', colour: '#5a7a8a', icon: 'scales' },
  decision: { label: 'Decision', colour: '#c2453a', icon: 'scroll' },
  consequence: { label: 'Consequence', colour: '#d07a1e', icon: 'split' },
  modern: { label: 'Today', colour: '#1f9a8a', icon: 'globe' },
};

export const EDGE_META: Record<string, { label: string; colour: string; dashed?: boolean }> = {
  supports: { label: 'supports', colour: '#2f7d4a' },
  objects: { label: 'objects', colour: '#c2453a', dashed: true },
  responds: { label: 'responds', colour: '#3a6fc2', dashed: true },
  develops: { label: 'develops', colour: '#b8892b' },
  rejects: { label: 'rejects', colour: '#9b2c2c', dashed: true },
  'leads-to': { label: 'leads to', colour: '#8a8a8a' },
  decides: { label: 'decides', colour: '#7a4fc2' },
};

export const REGION_LABEL: Record<string, string> = {
  levant: 'Levant', 'asia-minor': 'Asia Minor', 'greece-balkans': 'Greece & Balkans', italy: 'Italy',
  'western-europe': 'Western Europe', 'northern-europe': 'Northern Europe', 'eastern-europe': 'Eastern Europe',
  russia: 'Russia', egypt: 'Egypt', 'north-africa': 'North Africa', 'ethiopia-nubia': 'Ethiopia & Nubia',
  'sub-saharan-africa': 'Sub-Saharan Africa', 'armenia-caucasus': 'Armenia & Caucasus',
  'mesopotamia-persia': 'Mesopotamia & Persia', arabia: 'Arabia', 'central-asia': 'Central Asia', india: 'India',
  'east-asia': 'East Asia', 'southeast-asia': 'Southeast Asia', 'latin-america': 'Latin America',
  'north-america': 'North America', oceania: 'Oceania', global: 'Global',
};

export const WESTERN_REGIONS = new Set(['italy', 'western-europe', 'northern-europe', 'north-america']);

export function formatYear(y: number | undefined, circa = false) {
  if (y === undefined) return '';
  const s = y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : String(y);
  return circa ? `c. ${s}` : s;
}

export function formatSpan(a?: number, b?: number, circa = false) {
  if (a === undefined) return '';
  if (b === undefined || b === a) return formatYear(a, circa);
  return `${formatYear(a, circa)}–${b < 1000 && a >= 0 ? b : formatYear(b)}`;
}
