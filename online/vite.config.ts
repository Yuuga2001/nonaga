import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/online/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2015', // Better compatibility with older browsers
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
      },
    },
  },
  server: {
    port: 5173,
  },
});
