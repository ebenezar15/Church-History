import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { loadAtlas } from './data/db';

// Start fetching content packs immediately, in parallel with the app shell.
loadAtlas();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
