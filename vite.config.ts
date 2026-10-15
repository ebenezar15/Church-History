import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` produces one self-contained HTML file (all code, content, fonts and the
// world map inlined) that opens offline by double-click. It uses hash routing (see App.tsx).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode.startsWith('single') ? [viteSingleFile()] : [])],
  base: mode.startsWith('single') ? './' : '/',
  build: { chunkSizeWarningLimit: 4000 },
}));
