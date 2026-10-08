import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: '/src/playground/index.html',
  },
});