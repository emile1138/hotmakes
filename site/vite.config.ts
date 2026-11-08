import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// Five static pages share one React app. Each HTML file names its page in data-page.
const root = import.meta.dirname;
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        episodes: resolve(root, 'episodes/index.html'),
        prints: resolve(root, 'prints/index.html'),
        guests: resolve(root, 'guests/index.html'),
        donate: resolve(root, 'donate/index.html'),
      },
    },
  },
});
