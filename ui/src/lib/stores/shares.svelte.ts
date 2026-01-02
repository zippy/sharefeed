import { browser } from '$app/environment';
import type { ShareItem, StorageAdapter, GetSharesOptions } from '$lib/types';
import { DemoAdapter } from '$lib/adapters';

/**
 * Reactive shares state using Svelte 5 runes.
 * Connects to a storage adapter and keeps shares in sync.
 */
class SharesStore {
  private _shares = $state<ShareItem[]>([]);
  private _loading = $state(true);
  private _error = $state<string | null>(null);
  private _adapter: StorageAdapter | null = null;
  private _unsubscribe: (() => void) | null = null;

  get shares(): ShareItem[] {
    return this._shares;
  }

  get loading(): boolean {
    return this._loading;
  }

  get error(): string | null {
    return this._error;
  }

  get isEmpty(): boolean {
    return !this._loading && this._shares.length === 0;
  }

  /**
   * Initialize the store with a storage adapter.
   */
  async init(adapter: StorageAdapter): Promise<void> {
    // Disconnect from previous adapter if any
    await this.disconnect();

    this._adapter = adapter;
    this._loading = true;
    this._error = null;

    try {
      await adapter.connect();

      // Subscribe to updates
      this._unsubscribe = adapter.subscribeToShares((shares) => {
        this._shares = shares;
      });

      // Load initial shares
      this._shares = await adapter.getShares();
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to connect';
      console.error('Failed to initialize shares store:', err);
    } finally {
      this._loading = false;
    }
  }

  /**
   * Disconnect from the current adapter.
   */
  async disconnect(): Promise<void> {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._adapter) {
      await this._adapter.disconnect();
      this._adapter = null;
    }
  }

  /**
   * Refresh shares from the adapter.
   */
  async refresh(options?: GetSharesOptions): Promise<void> {
    if (!this._adapter) return;

    this._loading = true;
    this._error = null;

    try {
      this._shares = await this._adapter.getShares(options);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to load shares';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Load more shares for pagination.
   */
  async loadMore(limit: number = 10): Promise<void> {
    if (!this._adapter || this._shares.length === 0) return;

    const lastShare = this._shares[this._shares.length - 1];
    const moreShares = await this._adapter.getShares({
      after: lastShare.sharedAt,
      limit,
    });

    if (moreShares.length > 0) {
      this._shares = [...this._shares, ...moreShares];
    }
  }

  /**
   * Delete a share (if adapter supports it).
   */
  async deleteShare(id: string): Promise<void> {
    if (!this._adapter?.deleteShare) return;

    try {
      await this._adapter.deleteShare(id);
      this._shares = this._shares.filter((s) => s.id !== id);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to delete';
    }
  }
}

export const sharesStore = new SharesStore();

/**
 * Initialize the shares store with the appropriate adapter.
 * Call this from +layout.svelte or +page.svelte on mount.
 */
export async function initSharesStore(): Promise<void> {
  if (!browser) return;

  // For now, use demo adapter for easy testing
  // Later this will detect Holochain vs local file
  const adapter = new DemoAdapter();
  await sharesStore.init(adapter);
}
