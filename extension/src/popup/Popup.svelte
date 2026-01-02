<script lang="ts">
  import type { ShareMetadata, ShareItem, ExtensionMessage } from '@/types';

  // State using Svelte 5 runes
  let loading = $state(true);
  let sharing = $state(false);
  let success = $state(false);
  let error = $state<string | null>(null);
  let metadata = $state<ShareMetadata | null>(null);
  let recentShares = $state<ShareItem[]>([]);

  // Form state
  let customNote = $state('');
  let showRecent = $state(false);

  // Fetch metadata from current tab on mount
  $effect(() => {
    loadCurrentTabMetadata();
    loadRecentShares();
  });

  async function loadCurrentTabMetadata() {
    loading = true;
    error = null;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        error = 'Cannot access this page';
        loading = false;
        return;
      }

      // Skip non-http URLs
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        error = 'Cannot share this type of page';
        loading = false;
        return;
      }

      // Try to get metadata from content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' });
        if (response?.type === 'METADATA_RESPONSE') {
          metadata = response.payload;
        }
      } catch {
        // Content script might not be loaded, use tab info
        metadata = {
          url: tab.url,
          title: tab.title || 'Untitled',
          favicon: tab.favIconUrl,
        };
      }
    } catch (err) {
      error = 'Failed to load page information';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadRecentShares() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SHARES' });
      if (response?.type === 'SHARES_RESPONSE') {
        recentShares = response.payload.slice(0, 5);
      }
    } catch (err) {
      console.error('Failed to load recent shares:', err);
    }
  }

  async function handleShare() {
    if (!metadata) return;

    sharing = true;
    error = null;

    try {
      const shareData: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'> = {
        url: metadata.url,
        title: metadata.title,
        description: customNote || metadata.description,
        selection: metadata.selection,
        favicon: metadata.favicon,
      };

      const response: ExtensionMessage = await chrome.runtime.sendMessage({
        type: 'SHARE_ITEM',
        payload: shareData,
      });

      if (response.type === 'SHARE_SUCCESS') {
        success = true;
        customNote = '';
        await loadRecentShares();

        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else if (response.type === 'SHARE_ERROR') {
        error = response.payload;
      }
    } catch (err) {
      error = 'Failed to share. Please try again.';
      console.error(err);
    } finally {
      sharing = false;
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  function truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max - 1) + '…';
  }
</script>

<main>
  <header>
    <h1>ShareFeed</h1>
  </header>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading page info...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <p>{error}</p>
    </div>
  {:else if success}
    <div class="success-message">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
      </svg>
      <p>Shared successfully</p>
    </div>
  {:else if metadata}
    <div class="share-form">
      <div class="preview">
        {#if metadata.favicon}
          <img src={metadata.favicon} alt="" class="favicon" onerror={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
        {/if}
        <div class="preview-text">
          <h2>{truncate(metadata.title, 60)}</h2>
          <p class="url">{truncate(metadata.url, 50)}</p>
        </div>
      </div>

      {#if metadata.description}
        <p class="description">{truncate(metadata.description, 150)}</p>
      {/if}

      {#if metadata.selection}
        <blockquote class="selection">
          "{truncate(metadata.selection, 200)}"
        </blockquote>
      {/if}

      <div class="form-group">
        <label for="note">Add a note (optional)</label>
        <textarea
          id="note"
          bind:value={customNote}
          placeholder="Why are you sharing this?"
          rows="2"
        ></textarea>
      </div>

      <button class="share-button" onclick={handleShare} disabled={sharing}>
        {#if sharing}
          Sharing...
        {:else}
          Share
        {/if}
      </button>
    </div>
  {/if}

  {#if recentShares.length > 0 && !loading && !success}
    <div class="recent-section">
      <button class="toggle-recent" onclick={() => showRecent = !showRecent}>
        {showRecent ? 'Hide' : 'Show'} recent shares ({recentShares.length})
      </button>

      {#if showRecent}
        <ul class="recent-list">
          {#each recentShares as share}
            <li>
              <a href={share.url} target="_blank" rel="noopener">
                {truncate(share.title, 40)}
              </a>
              <span class="time">{formatDate(share.sharedAt)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</main>

<style>
  main {
    padding: 16px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .loading, .error-message, .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    color: var(--error-color);
  }

  .success-message {
    color: var(--success-color);
  }

  .success-message svg {
    margin-bottom: 12px;
  }

  .share-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .favicon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .preview-text {
    flex: 1;
    min-width: 0;
  }

  .preview-text h2 {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .url {
    font-size: 12px;
    color: #666;
    word-break: break-all;
  }

  .description {
    font-size: 13px;
    color: #555;
    background: var(--input-bg);
    padding: 8px 12px;
    border-radius: 6px;
  }

  .selection {
    font-size: 13px;
    font-style: italic;
    color: #555;
    border-left: 3px solid var(--primary-color);
    padding: 8px 12px;
    margin: 0;
    background: var(--input-bg);
    border-radius: 0 6px 6px 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    background: var(--input-bg);
  }

  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
  }

  .share-button {
    width: 100%;
    padding: 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .share-button:hover:not(:disabled) {
    background: var(--primary-hover);
  }

  .share-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .recent-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .toggle-recent {
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 0;
  }

  .toggle-recent:hover {
    color: var(--primary-color);
  }

  .recent-list {
    list-style: none;
    margin-top: 8px;
  }

  .recent-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }

  .recent-list a {
    color: var(--text-color);
    text-decoration: none;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-list a:hover {
    color: var(--primary-color);
  }

  .time {
    color: #999;
    font-size: 11px;
    margin-left: 8px;
    flex-shrink: 0;
  }
</style>
