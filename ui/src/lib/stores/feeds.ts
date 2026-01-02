import { writable, get } from 'svelte/store';
import {
  getClient,
  type ShareFeedClient,
  type Feed as HcFeed,
  type FeedInfo,
  type ActionHash,
  type AgentPubKey,
} from '$lib/holochain';
import { encodeHashToBase64 } from '@holochain/client';
import type { ShareItem } from './shares';

const browser = typeof window !== 'undefined';

/**
 * UI-friendly feed type.
 */
export interface Feed {
  id: string;
  actionHash: ActionHash;
  name: string;
  description?: string;
  stewards: string[];
  isPublic: boolean;
  createdAt: number;
}

/**
 * Convert Holochain FeedInfo to UI Feed
 */
function toFeed(info: FeedInfo): Feed {
  const timestampMs =
    typeof info.created_at === 'number'
      ? info.created_at / 1000
      : Number(info.created_at) / 1000;

  return {
    id: encodeHashToBase64(info.action_hash),
    actionHash: info.action_hash,
    name: info.feed.name,
    description: info.feed.description ?? undefined,
    stewards: info.feed.stewards.map((s) => encodeHashToBase64(s)),
    isPublic: info.feed.is_public,
    createdAt: timestampMs,
  };
}

/**
 * Creates the feeds store with Svelte 3 writable pattern.
 */
function createFeedsStore() {
  const feeds = writable<Feed[]>([]);
  const loading = writable(true);
  const error = writable<string | null>(null);

  let client: ShareFeedClient | null = null;

  async function refresh(): Promise<void> {
    if (!browser) return;

    client = getClient();
    if (!client) return;

    loading.set(true);
    error.set(null);

    try {
      const feedInfos = await client.getMyFeeds();
      feeds.set(feedInfos.map(toFeed));
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to load feeds');
      console.error('Failed to refresh feeds:', err);
    } finally {
      loading.set(false);
    }
  }

  async function createFeed(
    name: string,
    description?: string,
    isPublic: boolean = false,
    stewards: AgentPubKey[] = []
  ): Promise<Feed | null> {
    client = getClient();
    if (!client) return null;

    try {
      const feed: HcFeed = {
        name,
        description: description ?? null,
        stewards,
        is_public: isPublic,
      };
      await client.createFeed(feed);
      await refresh();
      // Return the newest feed
      const currentFeeds = get(feeds);
      return currentFeeds.find((f) => f.name === name) ?? null;
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to create feed');
      console.error('Failed to create feed:', err);
      return null;
    }
  }

  async function deleteFeed(id: string): Promise<void> {
    client = getClient();
    if (!client) return;

    const currentFeeds = get(feeds);
    const feed = currentFeeds.find((f) => f.id === id);
    if (!feed) return;

    try {
      await client.deleteFeed(feed.actionHash);
      feeds.set(currentFeeds.filter((f) => f.id !== id));
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to delete feed');
      console.error('Failed to delete feed:', err);
    }
  }

  async function addShareToFeed(feedId: string, shareActionHash: ActionHash): Promise<void> {
    client = getClient();
    if (!client) return;

    const currentFeeds = get(feeds);
    const feed = currentFeeds.find((f) => f.id === feedId);
    if (!feed) return;

    try {
      await client.addShareToFeed({
        feed_hash: feed.actionHash,
        share_item_hash: shareActionHash,
      });
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to add share to feed');
      console.error('Failed to add share to feed:', err);
    }
  }

  async function getFeedShares(feedId: string): Promise<ShareItem[]> {
    client = getClient();
    if (!client) return [];

    const currentFeeds = get(feeds);
    const feed = currentFeeds.find((f) => f.id === feedId);
    if (!feed) return [];

    try {
      const shareInfos = await client.getFeedShares(feed.actionHash);
      return shareInfos.map((info) => {
        const timestampMs =
          typeof info.created_at === 'number'
            ? info.created_at / 1000
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
      });
    } catch (err) {
      error.set(err instanceof Error ? err.message : 'Failed to get feed shares');
      console.error('Failed to get feed shares:', err);
      return [];
    }
  }

  return {
    // Expose stores for subscription
    feeds,
    loading,
    error,
    // Methods
    refresh,
    createFeed,
    deleteFeed,
    addShareToFeed,
    getFeedShares,
  };
}

export const feedsStore = createFeedsStore();
