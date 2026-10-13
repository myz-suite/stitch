import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static, client-only build. `base: './'` makes the output work when opened
// from any sub-path (GitHub Pages, OSS, CDN, ...).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
