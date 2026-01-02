<script lang="ts">
  import { onMount } from 'svelte';
  import { initSharesStore, settingsStore } from '$lib/stores';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Reactive settings
  let fontSize = $derived(settingsStore.fontSize);
  let highContrast = $derived(settingsStore.highContrast);
  let reducedMotion = $derived(settingsStore.reducedMotion);

  onMount(() => {
    initSharesStore();
  });
</script>

<div
  class="app-container"
  class:high-contrast={highContrast}
  class:reduced-motion={reducedMotion}
  style="--base-font-size: {fontSize}px"
>
  {@render children()}
</div>

<style>
  :global(html) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #f3f4f6;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app-container {
    min-height: 100vh;
    font-size: var(--base-font-size, 18px);
  }

  .app-container.high-contrast {
    background: #ffffff;
  }

  .app-container.reduced-motion :global(*) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
</style>
