import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `pages` mode is used only by `npm run build:pages` for GitHub Pages.
// Local `vite` / `vite build` keep base `/` so http://localhost:5173 works.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? '/system-down-simulator/' : '/',
}));
