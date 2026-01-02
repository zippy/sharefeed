import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: parseInt(process.env.UI_PORT || '1420'),
    strictPort: true,
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      // Force use of local libsodium-wrappers (0.7.15) instead of hoisted version (0.7.16)
      'libsodium-wrappers': resolve(__dirname, 'node_modules/libsodium-wrappers'),
    },
  },
  optimizeDeps: {
    include: ['@holochain/client', 'libsodium-wrappers'],
  },
  build: {
    outDir: 'dist',
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
  },
});
