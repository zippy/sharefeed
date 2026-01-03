# Lessons Learned

## @holochain/client in Chrome Extension Service Workers

### Problem
The `@holochain/client` library doesn't work out-of-the-box in Chrome Manifest V3 service workers. The library checks for browser environment using `globalThis.window.Blob`, `window.crypto`, and possibly `window.location`. Service workers don't have a `window` global.

### Symptoms
- Service worker module fails to fully load
- No message listeners get registered
- "No secure random number generator found" error
- "UnknownMessageFormat" error during `issueAppAuthenticationToken`

### Solution
Create a Vite plugin that injects a polyfill at the very start of the chunk containing `@holochain/client`:

```typescript
// vite.config.ts
const serviceWorkerPolyfill = `(function(){
  if(typeof globalThis.window==='undefined'){
    globalThis.window={
      Blob: typeof Blob!=='undefined' ? Blob : undefined,
      crypto: typeof crypto!=='undefined' ? crypto : undefined,
      location: { protocol: 'chrome-extension:' }
    };
  }
})();`;

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
```

### Key Points
1. The polyfill MUST run before any `@holochain/client` code executes
2. ES module imports are hoisted, so polyfills in source files run AFTER imports
3. Use a Vite `generateBundle` hook to inject at the start of the compiled chunk
4. Must provide `window.Blob`, `window.crypto`, AND `window.location`
5. Service workers have `crypto` and `Blob` on `globalThis`/`self`, just not on `window`

### Debugging Tips
- Use Playwright tests to verify service worker behavior (requires non-headless mode)
- Add global markers to track module loading progress
- The `context.on('console')` in Playwright doesn't capture service worker logs
- Use `sw.evaluate()` to check globals in the service worker context

## Holochain Default Settings

### Problem
Default Holochain settings with `enabled: true` and default ports (30001/30000) cause the extension to hang for 30 seconds on first load, waiting for a non-existent conductor connection.

### Solution
Set defaults to disabled:
```typescript
const DEFAULT_SETTINGS: HolochainSettings = {
  adminPort: 0,
  appPort: 0,
  enabled: false, // Disabled by default - user must configure ports first
};
```

This ensures the extension works immediately with local storage, and users opt-in to Holochain when they configure the ports.
