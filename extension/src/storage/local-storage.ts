import type { ShareItem, StorageAdapter, GetSharesOptions } from '@/types';

const STORAGE_KEY = 'sharefeed_shares';

/**
 * Local storage adapter using chrome.storage.local.
 * This will be replaced by a Holochain adapter in Phase 4+.
 */
export class LocalStorageAdapter implements StorageAdapter {
  /**
   * Save a new share item to local storage.
   */
  async saveShare(share: ShareItem): Promise<void> {
    const shares = await this.getAllShares();
    shares.unshift(share); // Add to beginning (newest first)
    await this.setAllShares(shares);
  }

  /**
   * Get shares from local storage with optional filtering.
   */
  async getShares(options?: GetSharesOptions): Promise<ShareItem[]> {
    let shares = await this.getAllShares();

    // Filter by feedId if specified
    if (options?.feedId !== undefined) {
      shares = shares.filter((s) => s.feedId === options.feedId);
    }

    // Filter by timestamp if specified (for pagination)
    if (options?.after !== undefined) {
      shares = shares.filter((s) => s.sharedAt < options.after!);
    }

    // Apply limit if specified
    if (options?.limit !== undefined) {
      shares = shares.slice(0, options.limit);
    }

    return shares;
  }

  /**
   * Delete a share by ID.
   */
  async deleteShare(id: string): Promise<void> {
    const shares = await this.getAllShares();
    const filtered = shares.filter((s) => s.id !== id);
    await this.setAllShares(filtered);
  }

  /**
   * Get a single share by ID.
   */
  async getShare(id: string): Promise<ShareItem | null> {
    const shares = await this.getAllShares();
    return shares.find((s) => s.id === id) || null;
  }

  /**
   * Get all shares from storage (internal helper).
   */
  private async getAllShares(): Promise<ShareItem[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  /**
   * Set all shares in storage (internal helper).
   */
  private async setAllShares(shares: ShareItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: shares });
  }
}

/**
 * Singleton instance of the local storage adapter.
 */
let instance: LocalStorageAdapter | null = null;

export function getLocalStorageAdapter(): LocalStorageAdapter {
  if (!instance) {
    instance = new LocalStorageAdapter();
  }
  return instance;
}

/**
 * Generate a unique ID for a share item.
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random.
 */
export function generateShareId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get a local identifier for the current user.
 * In Phase 4+, this will be replaced by the Holochain agent pubkey.
 */
export function getLocalUserId(): string {
  const key = 'sharefeed_local_user_id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;

  const newId = generateShareId();
  localStorage.setItem(key, newId);
  return newId;
}
