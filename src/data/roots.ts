/** Display metadata for the Church Fathers and Pagan Influences sections (labels in English and Tamil). */
import type { IconName } from '../components/Icon';
import type { ChurchFather, PaganInfluence } from './schema';
import { isTA } from '../i18n/lang';

type Meta = { en: string; ta: string; colour: string };
type School = ChurchFather['school'];
type Root = ChurchFather['roots'][number]['root'];
type View = ChurchFather['reception'][number]['view'];
type Evidence = PaganInfluence['evidence'];
type Category = PaganInfluence['category'];
type SourceTradition = PaganInfluence['sourceTradition'];

export const lbl = (m: { en: string; ta: string }) => (isTA() ? m.ta : m.en);

export const SCHOOL_META: Record<School, Meta> = {
  'apostolic-fathers': { en: 'Apostolic Fathers', ta: 'அப்போஸ்தலிக்கப் பிதாக்கள்', colour: '#b8892b' },
  apologists: { en: 'Apologists', ta: 'விசுவாசப் பாதுகாவலர்கள்', colour: '#c0392b' },
  alexandrian: { en: 'Alexandrian school', ta: 'அலெக்சாந்திரியப் பள்ளி', colour: '#2a8fb8' },
  antiochene: { en: 'Antiochene school', ta: 'அந்தியோக்கியப் பள்ளி', colour: '#2e9d5b' },
  cappadocian: { en: 'Cappadocians', ta: 'கப்பதோக்கியர்', colour: '#7a4fc2' },
  'latin-african': { en: 'Latin Africa', ta: 'லத்தீன் ஆப்பிரிக்கா', colour: '#d07a1e' },
  'latin-western': { en: 'Latin West', ta: 'லத்தீன் மேற்கு', colour: '#a0522d' },
  syriac: { en: 'Syriac', ta: 'சீரியாக்', colour: '#1f9e89' },
  'desert-monastic': { en: 'Desert & monastic', ta: 'பாலைவனத் துறவிகள்', colour: '#8a6d3b' },
  byzantine: { en: 'Byzantine', ta: 'பைசாந்தியம்', colour: '#4169e1' },
};
export const SCHOOLS = Object.keys(SCHOOL_META) as School[];

export const LANG_META: Record<ChurchFather['language'], Meta> = {
  greek: { en: 'Greek', ta: 'கிரேக்கம்', colour: '#2a8fb8' },
  latin: { en: 'Latin', ta: 'லத்தீன்', colour: '#c0392b' },
  syriac: { en: 'Syriac', ta: 'சீரியாக்', colour: '#1f9e89' },
  coptic: { en: 'Coptic', ta: 'காப்டிக்', colour: '#8a6d3b' },
  armenian: { en: 'Armenian', ta: 'ஆர்மீனியம்', colour: '#7a4fc2' },
};

/** The "roots" that shaped the Fathers, grouped into biblical, philosophical, Roman and church streams. */
export const ROOT_META: Record<Root, Meta & { group: 'bible' | 'philosophy' | 'rome' | 'church' }> = {
  'hebrew-scripture': { en: 'Hebrew Scripture', ta: 'எபிரேய வேதாகமம்', colour: '#b8892b', group: 'bible' },
  'second-temple-judaism': { en: 'Second Temple Judaism', ta: 'இரண்டாம் ஆலய யூத மதம்', colour: '#c9a23a', group: 'bible' },
  philo: { en: 'Philo of Alexandria', ta: 'அலெக்சாந்திரியாவின் பைலோ', colour: '#d6b44a', group: 'bible' },
  'apostolic-tradition': { en: 'Apostolic tradition', ta: 'அப்போஸ்தலிக்க மரபு', colour: '#e0a020', group: 'bible' },
  platonism: { en: 'Platonism', ta: 'பிளேட்டோவியம்', colour: '#2a8fb8', group: 'philosophy' },
  'middle-platonism': { en: 'Middle Platonism', ta: 'இடைக்காலப் பிளேட்டோவியம்', colour: '#3aa0c8', group: 'philosophy' },
  neoplatonism: { en: 'Neoplatonism', ta: 'நவப் பிளேட்டோவியம்', colour: '#4169e1', group: 'philosophy' },
  stoicism: { en: 'Stoicism', ta: 'ஸ்தோயிக்கம்', colour: '#1f9e89', group: 'philosophy' },
  aristotle: { en: 'Aristotle', ta: 'அரிஸ்டாட்டில்', colour: '#2e9d5b', group: 'philosophy' },
  'roman-law': { en: 'Roman law', ta: 'ரோமச் சட்டம்', colour: '#c0392b', group: 'rome' },
  rhetoric: { en: 'Classical rhetoric', ta: 'செவ்வியல் சொல்லாட்சி', colour: '#d07a1e', group: 'rome' },
  'imperial-church': { en: 'Imperial church', ta: 'பேரரசுத் திருச்சபை', colour: '#a0522d', group: 'rome' },
  'anti-gnostic': { en: 'Against Gnosticism', ta: 'ஞானக்கொள்கை எதிர்ப்பு', colour: '#7a4fc2', group: 'church' },
  'earlier-fathers': { en: 'Earlier Fathers', ta: 'முந்தைய பிதாக்கள்', colour: '#9b59b6', group: 'church' },
  monasticism: { en: 'Monasticism', ta: 'துறவறம்', colour: '#8a6d3b', group: 'church' },
};
export const ROOTS = Object.keys(ROOT_META) as Root[];
export const ROOT_GROUPS: Record<'bible' | 'philosophy' | 'rome' | 'church', Meta> = {
  bible: { en: 'Scripture & Judaism', ta: 'வேதமும் யூத மதமும்', colour: '#b8892b' },
  philosophy: { en: 'Greek philosophy', ta: 'கிரேக்கத் தத்துவம்', colour: '#2a8fb8' },
  rome: { en: 'Rome & culture', ta: 'ரோமும் பண்பாடும்', colour: '#c0392b' },
  church: { en: 'The church itself', ta: 'திருச்சபையே', colour: '#7a4fc2' },
};

export const VIEW_META: Record<View, Meta> = {
  saint: { en: 'Saint', ta: 'புனிதர்', colour: '#b8892b' },
  doctor: { en: 'Doctor of the Church', ta: 'திருச்சபையின் மறைவல்லுநர்', colour: '#7a4fc2' },
  father: { en: 'Father', ta: 'பிதா', colour: '#2a8fb8' },
  respected: { en: 'Respected', ta: 'மதிக்கப்படுபவர்', colour: '#2e9d5b' },
  controversial: { en: 'Controversial', ta: 'சர்ச்சைக்குரியவர்', colour: '#d07a1e' },
  condemned: { en: 'Condemned', ta: 'கண்டிக்கப்பட்டவர்', colour: '#c0392b' },
};

export const EVIDENCE_META: Record<Evidence, Meta & { level: number; icon: IconName; note: { en: string; ta: string } }> = {
  strong: { en: 'Strong evidence', ta: 'வலுவான சான்று', colour: '#2e9d5b', level: 4, icon: 'check', note: { en: 'well documented borrowing or adaptation', ta: 'நன்கு ஆவணப்படுத்தப்பட்ட கடன்வாங்கல் அல்லது தழுவல்' } },
  plausible: { en: 'Plausible', ta: 'சாத்தியமானது', colour: '#2a8fb8', level: 3, icon: 'info', note: { en: 'likely, but the details are debated', ta: 'சாத்தியம், ஆனால் விவரங்கள் விவாதத்தில் உள்ளன' } },
  disputed: { en: 'Disputed', ta: 'சர்ச்சைக்குரியது', colour: '#d07a1e', level: 2, icon: 'scales', note: { en: 'scholars are divided', ta: 'அறிஞர்கள் பிளவுபட்டுள்ளனர்' } },
  myth: { en: 'Popular myth', ta: 'பரவலான கட்டுக்கதை', colour: '#c0392b', level: 1, icon: 'close', note: { en: 'a popular claim without good evidence', ta: 'நல்ல சான்று இல்லாத பரவலான கூற்று' } },
};
export const EVIDENCES = Object.keys(EVIDENCE_META) as Evidence[];

export const CATEGORY_META: Record<Category, Meta & { icon: IconName }> = {
  philosophy: { en: 'Philosophy & ideas', ta: 'தத்துவமும் கருத்துகளும்', colour: '#2a8fb8', icon: 'scroll' },
  'calendar-festivals': { en: 'Calendar & festivals', ta: 'நாட்காட்டியும் பண்டிகைகளும்', colour: '#d6a02a', icon: 'sun' },
  'art-symbols': { en: 'Art, symbols & buildings', ta: 'கலை, சின்னங்கள், கட்டடங்கள்', colour: '#7a4fc2', icon: 'palette' },
  'worship-practice': { en: 'Worship & devotion', ta: 'வழிபாடும் பக்தியும்', colour: '#c0392b', icon: 'lamp' },
  'organisation-law': { en: 'Organisation & law', ta: 'அமைப்பும் சட்டமும்', colour: '#a0522d', icon: 'keys' },
  'popular-religion': { en: 'Folk religion', ta: 'நாட்டுப்புற மதம்', colour: '#2e9d5b', icon: 'sparkles' },
  'language-learning': { en: 'Language & learning', ta: 'மொழியும் கல்வியும்', colour: '#1f9e89', icon: 'book' },
};
export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export const SOURCE_META: Record<SourceTradition, Meta> = {
  'greek-philosophy': { en: 'Greek philosophy', ta: 'கிரேக்கத் தத்துவம்', colour: '#2a8fb8' },
  'roman-religion': { en: 'Roman religion', ta: 'ரோம மதம்', colour: '#c0392b' },
  'roman-state': { en: 'Roman state', ta: 'ரோம அரசு', colour: '#a0522d' },
  'mystery-cults': { en: 'Mystery cults', ta: 'மறைபொருள் வழிபாட்டுக் குழுக்கள்', colour: '#7a4fc2' },
  'sol-invictus': { en: 'Sol Invictus', ta: 'சோல் இன்விக்டஸ்', colour: '#e0a020' },
  egyptian: { en: 'Egyptian religion', ta: 'எகிப்திய மதம்', colour: '#b8892b' },
  germanic: { en: 'Germanic & Norse', ta: 'ஜெர்மானிய, நார்ஸ் மதம்', colour: '#4a6fa5' },
  celtic: { en: 'Celtic', ta: 'கெல்டிக்', colour: '#2e9d5b' },
  slavic: { en: 'Slavic', ta: 'ஸ்லாவிக்', colour: '#8b4513' },
  'near-eastern': { en: 'Ancient Near East', ta: 'பண்டைய அண்மைக் கிழக்கு', colour: '#d07a1e' },
  'folk-religion': { en: 'Folk religion', ta: 'நாட்டுப்புற மதம்', colour: '#6b8e23' },
  'classical-culture': { en: 'Classical culture', ta: 'செவ்வியல் பண்பாடு', colour: '#1f9e89' },
};

export const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_TA = ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'];
export const monthName = (m: number) => (isTA() ? MONTHS_TA : MONTHS_EN)[m - 1];

/** Life span of a Father: "c. 130 – c. 202". */
export function lifeSpan(f: Pick<ChurchFather, 'born' | 'died' | 'circa'>) {
  const c = f.circa ? (isTA() ? 'சு. ' : 'c. ') : '';
  const y = (n?: number) => (n === undefined ? '?' : `${c}${n}`);
  return `${y(f.born)} – ${y(f.died)}`;
}
