/**
 * Core type for a shared item.
 * This interface is designed to be compatible with Holochain storage in later phases.
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
  /** Target feed ID (null/undefined = personal feed) */
  feedId?: string;
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Metadata extracted from a web page for sharing.
 */
export interface ShareMetadata {
  /** Page URL */
  url: string;
  /** Page title from <title> tag */
  title: string;
  /** Meta description or og:description */
  description?: string;
  /** Favicon as base64 data URL */
  favicon?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** User-selected text, if any */
  selection?: string;
}

/**
 * Message types for communication between extension components.
 */
export type ExtensionMessage =
  | { type: 'GET_METADATA' }
  | { type: 'METADATA_RESPONSE'; payload: ShareMetadata }
  | { type: 'GET_SELECTION' }
  | { type: 'SELECTION_RESPONSE'; payload: string | null }
  | { type: 'SHARE_ITEM'; payload: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'> }
  | { type: 'SHARE_SUCCESS'; payload: ShareItem }
  | { type: 'SHARE_ERROR'; payload: string }
  | { type: 'GET_SHARES' }
  | { type: 'SHARES_RESPONSE'; payload: ShareItem[] };

/**
 * Context menu share context - indicates what was right-clicked.
 */
export type ShareContext = 'page' | 'link' | 'selection' | 'image';

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
 * Phase 1: Local chrome.storage.local
 * Phase 4+: Holochain conductor
 */
export interface StorageAdapter {
  /** Save a new share item */
  saveShare(share: ShareItem): Promise<void>;
  /** Get shares, optionally filtered */
  getShares(options?: GetSharesOptions): Promise<ShareItem[]>;
  /** Delete a share by ID */
  deleteShare(id: string): Promise<void>;
  /** Get a single share by ID */
  getShare(id: string): Promise<ShareItem | null>;
}
