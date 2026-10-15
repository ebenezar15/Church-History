import { TA } from '../i18n/dict';

/** Published copies of each edition. The artifact links are the shareable claude.ai pages. */
const ARTIFACT = { en: 'https://claude.ai/artifact/JLtRXcf347NGoosqvFCo6N', ta: 'https://claude.ai/artifact/GKKu58Ezw65MPywj7XDojL' };
const SITE = 'https://raw.githack.com/ebenezar15/Church-History/claude/brave-hypatia-qjjkuy/docs/';

/** Links to the same page in the other language edition (English ⇄ தமிழ்). */
export function LangSwitch() {
  const other = TA ? 'en' : 'ta';
  const href = () => {
    let host = '';
    let hash = '';
    try {
      host = window.location.hostname;
      hash = window.location.hash;
    } catch { /* sandboxed */ }
    const path = other === 'ta' ? 'ta/index.html' : 'index.html';
    if (/github\.io$|githack\.com$|^localhost$|^127\./.test(host)) return (TA ? '../' : '') + path + hash;
    if (/claude|usercontent/.test(host) || !host) return ARTIFACT[other].includes('PENDING') ? SITE + path : ARTIFACT[other];
    return SITE + path + hash;
  };
  return (
    <a
      href={href()}
      onClick={(e) => { e.currentTarget.href = href(); }}
      target="_blank"
      rel="noopener"
      className="btn !px-2.5 text-sm font-semibold"
      title={TA ? 'Open the English edition' : 'தமிழ்ப் பதிப்பைத் திற (Tamil edition)'}
      data-no-tr
    >
      {TA ? 'English' : 'தமிழ்'}
    </a>
  );
}
