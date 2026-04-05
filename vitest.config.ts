import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@data': path.resolve(__dirname, 'src/data'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
