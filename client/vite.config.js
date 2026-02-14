import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/oembed': 'http://localhost:3001',
      '/embed': 'http://localhost:3001',
      '/v': 'http://localhost:3001',
    },
  },
});
