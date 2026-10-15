/** Display metadata for the Missions section (labels in English and Tamil). */
import type { IconName } from '../components/Icon';
import type { MissionMovement } from './schema';
import { isTA } from '../i18n/lang';

type Stream = MissionMovement['stream'];
type Status = MissionMovement['status'];
type RelationKind = MissionMovement['relations'][number]['kind'];

export const L = (en: string, ta: string) => (isTA() ? ta : en);

export const STREAM_META: Record<Stream, { en: string; ta: string; colour: string }> = {
  'early-church': { en: 'Early church', ta: 'ஆதித் திருச்சபை', colour: '#b8892b' },
  'church-of-the-east': { en: 'Church of the East', ta: 'கிழக்கின் திருச்சபை', colour: '#8a5a2b' },
  orthodox: { en: 'Orthodox', ta: 'ஆர்த்தடாக்ஸ்', colour: '#7a4fc2' },
  'catholic-orders': { en: 'Catholic orders', ta: 'கத்தோலிக்கத் துறவற சபைகள்', colour: '#c0392b' },
  pietist: { en: 'Pietist & Puritan', ta: 'பக்திவாத, தூய்மைவாத இயக்கங்கள்', colour: '#2a8fb8' },
  moravian: { en: 'Moravian', ta: 'மொரேவியன்', colour: '#1f9e89' },
  'evangelical-awakening': { en: 'Evangelical Awakening', ta: 'சுவிசேஷ எழுப்புதல்', colour: '#e05a2a' },
  'modern-missions': { en: 'Modern mission societies', ta: 'நவீன மிஷனரி சங்கங்கள்', colour: '#d07a1e' },
  'faith-missions': { en: 'Faith missions', ta: 'விசுவாச மிஷன்கள்', colour: '#a0522d' },
  holiness: { en: 'Holiness', ta: 'பரிசுத்த இயக்கம்', colour: '#6b8e23' },
  pentecostal: { en: 'Pentecostal', ta: 'பெந்தெகொஸ்தே', colour: '#d63384' },
  ecumenical: { en: 'Ecumenical', ta: 'சபை ஒருமைப்பாட்டு இயக்கம்', colour: '#4169e1' },
  'evangelical-postwar': { en: 'Post-war evangelical', ta: 'போருக்குப் பிந்தைய சுவிசேஷ இயக்கம்', colour: '#ff7f50' },
  indigenous: { en: 'Indigenous movements', ta: 'உள்நாட்டு இயக்கங்கள்', colour: '#228b22' },
  'global-south': { en: 'Global South', ta: 'உலகத் தென்பகுதி', colour: '#20b2aa' },
};

export const STATUS_META: Record<Status, { en: string; ta: string; colour: string; icon: IconName; mark: string }> = {
  active: { en: 'Still active', ta: 'இன்றும் செயல்படுகிறது', colour: '#2e9d5b', icon: 'flame', mark: '●' },
  transformed: { en: 'Transformed', ta: 'உருமாறியது', colour: '#2a8fb8', icon: 'sparkles', mark: '◆' },
  merged: { en: 'Merged', ta: 'இணைந்தது', colour: '#4169e1', icon: 'layers', mark: '⊕' },
  divided: { en: 'Divided', ta: 'பிளவுபட்டது', colour: '#d07a1e', icon: 'split', mark: '⑂' },
  declined: { en: 'Declined', ta: 'நலிவடைந்தது', colour: '#a08060', icon: 'hourglass', mark: '◐' },
  collapsed: { en: 'Collapsed', ta: 'சரிந்தது', colour: '#c0392b', icon: 'close', mark: '✕' },
  ended: { en: 'Ended', ta: 'முடிவுற்றது', colour: '#777', icon: 'hourglass', mark: '■' },
};

export const RELATION_META: Record<RelationKind, { en: string; ta: string; colour: string; dashed?: boolean }> = {
  'split-into': { en: 'split into', ta: 'பிளந்து உருவானது', colour: '#d07a1e' },
  'merged-into': { en: 'merged into', ta: 'இணைந்து உருவானது', colour: '#4169e1' },
  'gave-rise-to': { en: 'gave rise to', ta: 'தோற்றுவித்தது', colour: '#2e9d5b' },
  'succeeded-by': { en: 'succeeded by', ta: 'தொடர்ந்தது', colour: '#7a4fc2' },
  partnered: { en: 'partnered with', ta: 'இணைந்து பணியாற்றியது', colour: '#2a8fb8', dashed: true },
};

export const streamLabel = (s: Stream) => (isTA() ? STREAM_META[s].ta : STREAM_META[s].en);
export const statusLabel = (s: Status) => (isTA() ? STATUS_META[s].ta : STATUS_META[s].en);
export const relationLabel = (k: RelationKind) => (isTA() ? RELATION_META[k].ta : RELATION_META[k].en);
