import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Trailing slash matters: '/r' would also match /robots.txt, /report.json,
      // and any other path starting with 'r'. '/r/' is the correct matcher.
      '/r/':   { target: 'http://localhost:4000', changeOrigin: true },
      '/api':  { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
