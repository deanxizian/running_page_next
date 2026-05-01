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
          if (id.includes('node_modules')) {
            return 'vendors';
            // If there will be more and more external packages referenced in the future,
            // the following approach can be considered.
            // const name = id.split('node_modules/')[1].split('/');
            // return name[0] == '.pnpm' ? name[1] : name[0];
          } else {
            for (const item of individuallyPackages) {
              if (id.includes(item)) {
                return item;
              }
            }
          }
        },
      },
    },
  },
});
