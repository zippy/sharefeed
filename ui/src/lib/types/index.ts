/**
 * Core type for a shared item.
 * Compatible with both local storage and Holochain storage.
 */
export interface ShareItem {
  /** Unique identifier - UUID for local storage, ActionHash for Holochain */
  id: string;
  /** The shared URL (required) */
  url: string;
  /** Page title */
  title: string;
  /** Meta description or user-provided description */
  description?: string;
  /** User-selected text from the page */
  selection?: string;
  /** Base64 encoded favicon */
  favicon?: string;
  /** Base64 encoded screenshot thumbnail */
  thumbnail?: string;
  /** Unix timestamp (milliseconds) when the item was shared */
  sharedAt: number;
  /** Identifier for who shared the item - local ID or agent pubkey */
  sharedBy: string;
  /** Display name of the person who shared (for multi-user feeds) */
  sharedByName?: string;
  /** Target feed ID (null/undefined = personal feed) */
  feedId?: string;
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Options for retrieving shares from storage.
 */
export interface GetSharesOptions {
  /** Filter by feed ID */
  feedId?: string;
  /** Maximum number of items to return */
  limit?: number;
  /** Return items after this timestamp (for pagination) */
  after?: number;
}

/**
 * Storage adapter interface for pluggable storage backends.
 * Implemented by:
 * - LocalFileAdapter: Reads from local JSON file
 * - HolochainAdapter: Connects to Holochain conductor (Phase 4+)
 */
export interface StorageAdapter {
  /** Connect to the storage backend */
  connect(): Promise<void>;

  /** Disconnect from the storage backend */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  /** Get shares, optionally filtered */
  getShares(options?: GetSharesOptions): Promise<ShareItem[]>;

  /** Subscribe to share updates (returns unsubscribe function) */
  subscribeToShares(callback: (shares: ShareItem[]) => void): () => void;

  /** Create a new share (optional - not all adapters support writing) */
  createShare?(share: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'>): Promise<ShareItem>;

  /** Delete a share by ID (optional) */
  deleteShare?(id: string): Promise<void>;
}

/**
 * Accessibility settings for the feed display.
 */
export interface AccessibilitySettings {
  /** Base font size in pixels (18-32) */
  fontSize: number;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Show thumbnails in cards */
  showThumbnails: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
}

/**
 * Default accessibility settings.
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: 18,
  highContrast: false,
  showThumbnails: true,
  reducedMotion: false,
};

/**
 * Feed information (for multi-feed support).
 */
export interface Feed {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}
