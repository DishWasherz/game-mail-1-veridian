import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  define: {
    __POSTHOG_KEY__: JSON.stringify(process.env.POSTHOG_KEY || ''),
    __POSTHOG_HOST__: JSON.stringify(process.env.POSTHOG_HOST || ''),
    __SESSION_REPLAY__: JSON.stringify(process.env.SESSION_REPLAY === 'true')
  }
});
