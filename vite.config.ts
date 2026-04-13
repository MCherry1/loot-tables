import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Served from cherrykeep.com (custom domain) at the root. The old
  // '/loot-tables/' subpath was for GitHub Pages project-site hosting
  // at github.io/loot-tables/; the CNAME file in public/ switches the
  // deploy to the custom domain, and assets now need to resolve from /.
  base: '/',
  root: 'src/web',
  publicDir: '../../public',
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@data': path.resolve(__dirname, 'src/data'),
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
