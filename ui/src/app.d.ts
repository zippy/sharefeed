// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Holochain launcher globals (for Phase 4+)
  interface Window {
    __HC_LAUNCHER__?: {
      getAppPort(): Promise<number>;
      getAppToken(): Promise<Uint8Array>;
    };
  }
}

export {};
