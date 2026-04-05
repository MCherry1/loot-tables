import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
