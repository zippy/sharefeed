import type { StorageAdapter, ShareItem, GetSharesOptions } from '$lib/types';

/**
 * Base class for storage adapters with common functionality.
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  protected connected = false;
  protected subscribers: Set<(shares: ShareItem[]) => void> = new Set();

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getShares(options?: GetSharesOptions): Promise<ShareItem[]>;

  isConnected(): boolean {
    return this.connected;
  }

  subscribeToShares(callback: (shares: ShareItem[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  protected notifySubscribers(shares: ShareItem[]): void {
    for (const callback of this.subscribers) {
      callback(shares);
    }
  }
}

/**
 * Filter and paginate shares based on options.
 */
export function filterShares(shares: ShareItem[], options?: GetSharesOptions): ShareItem[] {
  let result = [...shares];

  // Sort by sharedAt descending (newest first)
  result.sort((a, b) => b.sharedAt - a.sharedAt);

  // Filter by feedId if specified
  if (options?.feedId !== undefined) {
    result = result.filter((s) => s.feedId === options.feedId);
  }

  // Filter by timestamp for pagination
  if (options?.after !== undefined) {
    result = result.filter((s) => s.sharedAt < options.after!);
  }

  // Apply limit
  if (options?.limit !== undefined) {
    result = result.slice(0, options.limit);
  }

  return result;
}
