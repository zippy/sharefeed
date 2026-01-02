import { writable, derived, get, type Readable } from 'svelte/store';
import {
  connect,
  getClient,
  isConnected,
  type ShareFeedClient,
  type ShareItem as HcShareItem,
  type ShareItemInfo,
  type ActionHash,
} from '$lib/holochain';
import { encodeHashToBase64 } from '@holochain/client';

const browser = typeof window !== 'undefined';

/**
 * UI-friendly share item type.
 * Converts Holochain types to more usable format.
 */
export interface ShareItem {
  id: string;
  actionHash: ActionHash;
  url: string;
  title: string;
  description?: string;
  selection?: string;
  favicon?: string;
  thumbnail?: string;
  sharedAt: number;
  sharedBy: string;
  sharedByName?: string;
  tags: string[];
}

interface SharesStoreState {
  shares: ShareItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  isEmpty: boolean;
}

/**
 * Convert Holochain ShareItemInfo to UI ShareItem
 */
function toShareItem(info: ShareItemInfo): ShareItem {
  const timestampMs =
    typeof info.created_at === 'number'
      ? info.created_at / 1000 // Holochain timestamps are in microseconds
      : Number(info.created_at) / 1000;

  return {
    id: encodeHashToBase64(info.action_hash),
    actionHash: info.action_hash,
    url: info.share_item.url,
    title: info.share_item.title,
    description: info.share_item.description ?? undefined,
    selection: info.share_item.selection ?? undefined,
    favicon: info.share_item.favicon ?? undefined,
    thumbnail: info.share_item.thumbnail ?? undefined,
    sharedAt: timestampMs,
    sharedBy: encodeHashToBase64(info.author),
    tags: info.share_item.tags,
  };
}

/**
 * Convert UI ShareItem input to Holochain ShareItem
 */
function toHcShareItem(
  share: Omit<ShareItem, 'id' | 'actionHash' | 'sharedAt' | 'sharedBy'>
): HcShareItem {
  return {
    url: share.url,
    title: share.title,
    description: share.description ?? null,
    selection: share.selection ?? null,
    favicon: share.favicon ?? null,
    thumbnail: share.thumbnail ?? null,
    tags: share.tags ?? [],
  };
}

/**
 * Creates the shares store with Svelte 3 writable pattern.
 */
function createSharesStore() {
  // Internal writable stores
  const _shares = writable<ShareItem[]>([]);
  const _loading = writable(true);
  const _error = writable<string | null>(null);
  const _connected = writable(false);

  let client: ShareFeedClient | null = null;

  // Combined derived store for subscription
  const combined: Readable<SharesStoreState> = derived(
    [_shares, _loading, _error, _connected],
    ([$shares, $loading, $error, $connected]) => ({
      shares: $shares,
      loading: $loading,
      error: $error,
      connected: $connected,
      isEmpty: !$loading && $shares.length === 0,
    })
  );

  async function init(): Promise<void> {
    if (!browser) return;

    _loading.set(true);
    _error.set(null);

    try {
      client = await connect();
      _connected.set(true);

      // Load initial shares
      await refresh();
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to connect to Holochain');
      console.error('Failed to initialize shares store:', err);
      _connected.set(false);
    } finally {
      _loading.set(false);
    }
  }

  async function refresh(): Promise<void> {
    if (!client) {
      // Try to get existing client
      client = getClient();
      if (!client) return;
    }

    _loading.set(true);
    _error.set(null);

    try {
      const shareInfos = await client.getRecentShares();
      _shares.set(shareInfos.map(toShareItem));
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to load shares');
      console.error('Failed to refresh shares:', err);
    } finally {
      _loading.set(false);
    }
  }

  async function createShare(
    share: Omit<ShareItem, 'id' | 'actionHash' | 'sharedAt' | 'sharedBy'>
  ): Promise<ShareItem | null> {
    if (!client) return null;

    try {
      await client.createShareItem(toHcShareItem(share));
      // Refresh to get the new share with all metadata
      await refresh();
      // Return the newly created share (should be first in the sorted list)
      return get(_shares)[0] ?? null;
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to create share');
      console.error('Failed to create share:', err);
      return null;
    }
  }

  async function deleteShare(id: string): Promise<void> {
    if (!client) return;

    const currentShares = get(_shares);
    const share = currentShares.find((s) => s.id === id);
    if (!share) return;

    try {
      await client.deleteShareItem(share.actionHash);
      _shares.set(currentShares.filter((s) => s.id !== id));
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to delete share');
      console.error('Failed to delete share:', err);
    }
  }

  function checkConnected(): boolean {
    return isConnected();
  }

  return {
    // Make store subscribable - returns SharesStoreState
    subscribe: combined.subscribe,
    // Methods
    init,
    refresh,
    createShare,
    deleteShare,
    isConnected: checkConnected,
  };
}

export const sharesStore = createSharesStore();

/**
 * Initialize the shares store.
 * Call this from App.svelte on mount.
 */
export async function initSharesStore(): Promise<void> {
  await sharesStore.init();
}
