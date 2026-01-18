import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Dev: /online/, Production: /_online/ (rewritten from /online/)
  base: command === 'serve' ? '/online/' : '/_online/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
}));
