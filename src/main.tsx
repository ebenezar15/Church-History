import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { loadAtlas } from './data/db';

// Start fetching content packs immediately, in parallel with the app shell.
loadAtlas();

// The Tamil edition installs its interface translator before the first render.
const boot = import.meta.env.VITE_LANG === 'ta' ? import('./i18n/ta').then((m) => m.install()) : Promise.resolve();
boot.finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
