import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.PATH_PREFIX || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VERCEL': JSON.stringify(process.env.VERCEL),
  },
  build: {
    manifest: true,
    outDir: './dist', // for user easy to use, vercel use default dir -> dist
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.endsWith('/src/static/activities.json')) {
            return 'activity-metadata';
          }
          if (id.endsWith('/src/static/activity_routes.json')) {
            return 'activity-routes';
          }
          if (id.endsWith('/src/static/event_routes.json')) {
            return 'event-routes';
          }
        },
      },
    },
  },
});
