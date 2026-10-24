/** Display metadata for the Denominations section (labels in English and Tamil). */
import type { DenomFact, DenomProfile, TraditionFamily } from './schema';
import { isTA } from '../i18n/lang';

type Axes = DenomProfile['axes'];
type Opt = { en: string; ta: string; colour: string };
export const tl = (m: { en: string; ta: string }) => (isTA() ? m.ta : m.en);

export const FAMILY_TA: Record<TraditionFamily, string> = {
  early: 'ஆதித் திருச்சபை', catholic: 'கத்தோலிக்கம்', orthodox: 'கிழக்கு ஆர்த்தடாக்ஸ்', oriental: 'கீழைத்தேய ஆர்த்தடாக்ஸ்',
  'east-syriac': 'கிழக்கின் திருச்சபை', lutheran: 'லூத்தரன்', reformed: 'சீர்திருத்தச் சபைகள்', anglican: 'ஆங்கிலிக்கன்',
  anabaptist: 'அனபாப்டிஸ்ட்', baptist: 'பாப்டிஸ்ட்', methodist: 'மெதடிஸ்ட், பரிசுத்த இயக்கம்', pentecostal: 'பெந்தெகொஸ்தே, கரிஸ்மாட்டிக்',
  restorationist: 'மீட்டமைப்பு இயக்கங்கள்', evangelical: 'சுவிசேஷ இயக்கம்', independent: 'சுயாதீன, சுதந்திரச் சபைகள்',
  nontrinitarian: 'நிசேயா அல்லாதவை', 'heterodox-ancient': 'பண்டைய மாற்றுக் குழுக்கள்', united: 'ஐக்கிய, இணையும் சபைகள்',
};

export const AXES: { key: keyof Axes; en: string; ta: string; question: { en: string; ta: string }; options: Record<string, Opt> }[] = [
  {
    key: 'trinity', en: 'God', ta: 'கடவுள்', question: { en: 'Do they confess the Nicene Trinity?', ta: 'நிசேயா திரித்துவத்தை அறிக்கையிடுகிறார்களா?' },
    options: { nicene: { en: 'Nicene Trinity', ta: 'நிசேயா திரித்துவம்', colour: '#2a8fb8' }, 'non-nicene': { en: 'Non-Nicene', ta: 'நிசேயா அல்லாதது', colour: '#8a8a8a' } },
  },
  {
    key: 'authority', en: 'Authority', ta: 'அதிகாரம்', question: { en: 'What is the final authority?', ta: 'இறுதி அதிகாரம் எது?' },
    options: {
      'scripture-tradition-magisterium': { en: 'Scripture, Tradition & teaching office', ta: 'வேதம், மரபு, போதக அதிகாரம்', colour: '#c2453a' },
      'scripture-and-tradition': { en: 'Scripture & Tradition', ta: 'வேதமும் மரபும்', colour: '#3a6fc2' },
      'scripture-alone': { en: 'Scripture alone', ta: 'வேதம் மட்டும்', colour: '#2f7d4a' },
      'scripture-and-spirit': { en: 'Scripture & the Spirit’s leading', ta: 'வேதமும் ஆவியின் வழிநடத்துதலும்', colour: '#e05a2a' },
      'scripture-and-new-revelation': { en: 'Scripture & new revelation', ta: 'வேதமும் புதிய வெளிப்பாடும்', colour: '#8a8a8a' },
    },
  },
  {
    key: 'governance', en: 'Leadership', ta: 'தலைமை', question: { en: 'How is the church led?', ta: 'சபை எவ்வாறு வழிநடத்தப்படுகிறது?' },
    options: {
      papal: { en: 'Pope & bishops', ta: 'திருத்தந்தையும் ஆயர்களும்', colour: '#c2453a' },
      episcopal: { en: 'Bishops', ta: 'ஆயர்கள்', colour: '#9b3f7a' },
      presbyterian: { en: 'Elders & synods', ta: 'மூப்பர்களும் சங்கங்களும்', colour: '#2f7d4a' },
      connexional: { en: 'Connexion & conference', ta: 'இணைப்பும் மாநாடும்', colour: '#c23a6a' },
      congregational: { en: 'Each congregation', ta: 'ஒவ்வொரு சபையும்', colour: '#2a8fb8' },
      'apostolic-network': { en: 'Apostles & networks', ta: 'அப்போஸ்தலர்களும் வலையமைப்புகளும்', colour: '#e05a2a' },
      none: { en: 'No ordained leadership', ta: 'நியமிக்கப்பட்ட தலைமை இல்லை', colour: '#5a7a8a' },
    },
  },
  {
    key: 'baptism', en: 'Baptism', ta: 'திருமுழுக்கு', question: { en: 'Whom do they baptise?', ta: 'யாருக்குத் திருமுழுக்கு அளிக்கிறார்கள்?' },
    options: {
      infant: { en: 'Infants & believers', ta: 'குழந்தைகளும் விசுவாசிகளும்', colour: '#3a6fc2' },
      believer: { en: 'Believers only', ta: 'விசுவாசிகள் மட்டும்', colour: '#2a8fb8' },
      both: { en: 'Either, by choice', ta: 'தெரிவுப்படி இரண்டும்', colour: '#4a8a7a' },
      none: { en: 'No water baptism', ta: 'நீர்த் திருமுழுக்கு இல்லை', colour: '#5a7a8a' },
    },
  },
  {
    key: 'eucharist', en: 'Lord’s Supper', ta: 'திருவிருந்து', question: { en: 'What happens at the Lord’s Supper?', ta: 'திருவிருந்தில் என்ன நடக்கிறது?' },
    options: {
      transformation: { en: 'Bread & wine become Christ', ta: 'அப்பமும் இரசமும் கிறிஸ்துவாக மாறுகின்றன', colour: '#c2453a' },
      'real-presence': { en: 'Christ truly present', ta: 'கிறிஸ்து உண்மையாகவே பிரசன்னம்', colour: '#d07a1e' },
      'spiritual-presence': { en: 'Spiritual presence', ta: 'ஆவிக்குரிய பிரசன்னம்', colour: '#2f7d4a' },
      memorial: { en: 'A memorial', ta: 'நினைவுகூருதல்', colour: '#2a8fb8' },
      'not-practised': { en: 'Not practised', ta: 'கடைப்பிடிக்கப்படுவதில்லை', colour: '#5a7a8a' },
    },
  },
  {
    key: 'gifts', en: 'Spiritual gifts', ta: 'ஆவிக்குரிய வரங்கள்', question: { en: 'Tongues, prophecy and healing today?', ta: 'இன்று அந்நியபாஷை, தீர்க்கதரிசனம், சுகமளித்தல்?' },
    options: {
      cessationist: { en: 'Ceased with the apostles', ta: 'அப்போஸ்தலருடன் நின்றுவிட்டன', colour: '#5a7a8a' },
      open: { en: 'Open but cautious', ta: 'திறந்த, ஆனால் எச்சரிக்கையான', colour: '#2a8fb8' },
      charismatic: { en: 'Welcomed', ta: 'வரவேற்கப்படுகின்றன', colour: '#d07a1e' },
      pentecostal: { en: 'Central (Spirit baptism)', ta: 'மையமானவை (ஆவியின் திருமுழுக்கு)', colour: '#e05a2a' },
    },
  },
  {
    key: 'women', en: 'Women in ministry', ta: 'ஊழியத்தில் பெண்கள்', question: { en: 'Are women ordained?', ta: 'பெண்கள் திருநிலைப்படுத்தப்படுகிறார்களா?' },
    options: {
      ordained: { en: 'Ordained', ta: 'திருநிலைப்படுத்தப்படுகிறார்கள்', colour: '#2f7d4a' },
      'some-roles': { en: 'Some roles', ta: 'சில பொறுப்புகள்', colour: '#d6a02a' },
      'not-ordained': { en: 'Not ordained', ta: 'திருநிலைப்படுத்தப்படுவதில்லை', colour: '#c2453a' },
      varies: { en: 'Varies', ta: 'மாறுபடும்', colour: '#8a8a8a' },
    },
  },
];

export const LITURGY_LABELS = { en: ['Free', 'Mostly free', 'Mixed', 'Mostly liturgical', 'Ancient liturgy'], ta: ['சுதந்திரம்', 'பெரும்பாலும் சுதந்திரம்', 'கலவை', 'பெரும்பாலும் வழிபாட்டு முறை', 'பண்டைய வழிபாட்டு முறை'] };
export const SACRAMENT_LABELS = { en: ['Symbolic', 'Mostly symbolic', 'Mixed', 'Sacramental', 'Fully sacramental'], ta: ['அடையாளமானது', 'பெரும்பாலும் அடையாளம்', 'கலவை', 'திருவருட்சாதனமானது', 'முழு திருவருட்சாதனம்'] };

export const VERDICT_META: Record<DenomFact['verdict'], Opt> = {
  accurate: { en: 'Accurate', ta: 'சரியானது', colour: '#2e9d5b' },
  complicated: { en: 'It’s complicated', ta: 'சிக்கலானது', colour: '#d6a02a' },
  misleading: { en: 'Misleading', ta: 'தவறாக வழிநடத்துவது', colour: '#d07a1e' },
  false: { en: 'False', ta: 'தவறானது', colour: '#c0392b' },
};

/** "1.3 billion", "47 million", "250,000" (with Tamil units). */
export function bigNumber(n: number) {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(n >= 1e10 ? 0 : 2)} ${isTA() ? 'பில்லியன்' : 'billion'}`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} ${isTA() ? 'மில்லியன்' : 'million'}`;
  return n.toLocaleString('en-IN');
}
