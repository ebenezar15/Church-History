import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { loadAtlas } from './data/db';
import { install as installTranslator } from './i18n/translate';
import { getLang, onLang } from './i18n/lang';

// Start fetching content packs immediately, in parallel with the app shell.
loadAtlas();

installTranslator();

/** Switching language reloads the atlas in that language and remounts the app on the same page. */
function Root() {
  const [lang, setShown] = useState(getLang());
  useEffect(() => onLang((l) => { loadAtlas(l).then(() => setShown(l)); }), []);
  return <App key={lang} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
