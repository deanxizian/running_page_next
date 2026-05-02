import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const individuallyPackages = ['activities'];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.PATH_PREFIX || '/',
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
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
          for (const item of individuallyPackages) {
            if (id.includes(item)) {
              return item;
            }
          }
        },
      },
    },
  },
});
