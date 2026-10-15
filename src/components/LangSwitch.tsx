import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getLang, onLang, setLang, type Lang } from '../i18n/lang';
import { loadAtlas } from '../data/db';

const OPTIONS: [Lang, string, string][] = [['en', 'EN', 'English'], ['ta', 'தமிழ்', 'Tamil']];

/** English ⇄ தமிழ் switch. The whole app (content, interface and the guide) changes language in place. */
export function LangSwitch() {
  const [lang, setShown] = useState(getLang());
  const [busy, setBusy] = useState(false);
  useEffect(() => onLang(setShown), []);
  const choose = (l: Lang) => {
    if (l === lang || busy) return;
    setBusy(true);
    // Unpack the language first so the switch happens in one step.
    loadAtlas(l).then(() => setLang(l)).finally(() => setBusy(false));
  };
  return (
    <div role="radiogroup" aria-label="Language / மொழி" className="relative flex rounded-full border border-line bg-surface p-0.5 text-sm font-semibold" data-no-tr>
      {OPTIONS.map(([id, label, name]) => (
        <button
          key={id}
          role="radio"
          aria-checked={lang === id}
          title={name}
          onClick={() => choose(id)}
          className={`relative z-10 rounded-full px-2 py-1 transition-colors sm:px-3 ${lang === id ? 'text-accent-ink' : 'text-muted hover:text-ink'}`}
        >
          {lang === id && <motion.span layoutId="lang-pill" className="absolute inset-0 -z-10 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          {busy && lang !== id ? '…' : label}
        </button>
      ))}
    </div>
  );
}
