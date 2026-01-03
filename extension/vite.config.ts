import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './manifest.json';

// Polyfill for @holochain/client in service worker environments
// This MUST run before any @holochain/client code loads
// Provides window.Blob and window.crypto for libraries that check these
// Wrapped in IIFE to avoid any parsing issues
const serviceWorkerPolyfill = `(function(){if(typeof globalThis.window==='undefined'){globalThis.window={Blob:typeof Blob!=='undefined'?Blob:undefined,crypto:typeof crypto!=='undefined'?crypto:undefined,location:{protocol:'chrome-extension:'}};console.log('[POLYFILL] Window polyfill applied');}})();`;

// Plugin to inject polyfill at the very start of chunks that use @holochain/client
function holochainServiceWorkerPolyfill(): Plugin {
  return {
    name: 'holochain-service-worker-polyfill',
    generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && fileName.includes('holochain-storage')) {
          chunk.code = serviceWorkerPolyfill + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    svelte(),
    crx({ manifest }),
    holochainServiceWorkerPolyfill(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Force use of local libsodium-wrappers (0.7.15) instead of hoisted version (0.7.16)
      'libsodium-wrappers': resolve(__dirname, 'node_modules/libsodium-wrappers'),
    },
  },
  optimizeDeps: {
    include: ['@holochain/client', 'libsodium-wrappers'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
