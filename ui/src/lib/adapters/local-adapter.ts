import type { ShareItem, GetSharesOptions } from '$lib/types';
import { BaseStorageAdapter, filterShares } from './storage-adapter';

/**
 * Local file adapter that reads shares from a JSON file.
 *
 * For development/testing, this reads from /static/shares.json
 * which can be populated manually or by the extension.
 *
 * In production with Holochain, this will be replaced by HolochainAdapter.
 */
export class LocalFileAdapter extends BaseStorageAdapter {
  private shares: ShareItem[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly dataUrl: string;

  constructor(dataUrl: string = '/shares.json') {
    super();
    this.dataUrl = dataUrl;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    await this.loadShares();
    this.connected = true;

    // Poll for updates every 5 seconds
    this.pollInterval = setInterval(() => {
      this.loadShares();
    }, 5000);
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.connected = false;
  }

  async getShares(options?: GetSharesOptions): Promise<ShareItem[]> {
    if (!this.connected) {
      await this.connect();
    }
    return filterShares(this.shares, options);
  }

  private async loadShares(): Promise<void> {
    try {
      const response = await fetch(this.dataUrl);
      if (!response.ok) {
        // File might not exist yet, that's ok
        if (response.status === 404) {
          this.shares = [];
          return;
        }
        throw new Error(`Failed to load shares: ${response.status}`);
      }

      const data = await response.json();

      // Handle both array format and object with shares property
      const newShares: ShareItem[] = Array.isArray(data) ? data : (data.shares || []);

      // Only notify if shares changed
      if (JSON.stringify(newShares) !== JSON.stringify(this.shares)) {
        this.shares = newShares;
        this.notifySubscribers(this.shares);
      }
    } catch (error) {
      // Don't throw on load errors - just keep existing shares
      console.warn('Failed to load shares:', error);
    }
  }
}

/**
 * Demo adapter with sample data for testing UI without a data file.
 */
export class DemoAdapter extends BaseStorageAdapter {
  private shares: ShareItem[] = [];

  async connect(): Promise<void> {
    if (this.connected) return;

    // Generate sample data
    this.shares = generateSampleShares();
    this.connected = true;
    this.notifySubscribers(this.shares);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getShares(options?: GetSharesOptions): Promise<ShareItem[]> {
    if (!this.connected) {
      await this.connect();
    }
    return filterShares(this.shares, options);
  }

  async createShare(
    share: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'>
  ): Promise<ShareItem> {
    const newShare: ShareItem = {
      ...share,
      id: crypto.randomUUID(),
      sharedAt: Date.now(),
      sharedBy: 'demo-user',
      sharedByName: 'Demo User',
    };
    this.shares.unshift(newShare);
    this.notifySubscribers(this.shares);
    return newShare;
  }

  async deleteShare(id: string): Promise<void> {
    this.shares = this.shares.filter((s) => s.id !== id);
    this.notifySubscribers(this.shares);
  }
}

/**
 * Generate sample shares for demo/testing.
 */
function generateSampleShares(): ShareItem[] {
  const now = Date.now();
  const hour = 3600000;
  const day = 24 * hour;

  return [
    {
      id: 'demo-1',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up - Rick Astley',
      description: 'The official video for "Never Gonna Give You Up" by Rick Astley.',
      sharedAt: now - 10 * 60000, // 10 minutes ago
      sharedBy: 'grandma',
      sharedByName: 'Grandma Betty',
      tags: ['music', 'classic'],
    },
    {
      id: 'demo-2',
      url: 'https://www.nytimes.com/2024/01/15/technology/ai-future.html',
      title: 'The Future of AI: What Experts Are Saying',
      description: 'A comprehensive look at how artificial intelligence is shaping our world and what we can expect in the coming years.',
      selection: 'AI will fundamentally change how we work and live within the next decade.',
      sharedAt: now - 2 * hour, // 2 hours ago
      sharedBy: 'uncle-bob',
      sharedByName: 'Uncle Bob',
      tags: ['technology', 'ai'],
    },
    {
      id: 'demo-3',
      url: 'https://www.allrecipes.com/recipe/chocolate-chip-cookies/',
      title: 'Best Chocolate Chip Cookies Ever',
      description: 'These chocolate chip cookies are perfectly crispy on the outside and chewy on the inside.',
      sharedAt: now - day, // 1 day ago
      sharedBy: 'mom',
      sharedByName: 'Mom',
      tags: ['recipes', 'baking'],
    },
    {
      id: 'demo-4',
      url: 'https://www.nationalgeographic.com/animals/mammals/facts/elephants',
      title: 'Elephant Facts and Information',
      description: 'Learn about the largest land animals on Earth, their behavior, habitat, and conservation status.',
      thumbnail: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300',
      sharedAt: now - 2 * day, // 2 days ago
      sharedBy: 'grandpa',
      sharedByName: 'Grandpa Joe',
      tags: ['nature', 'animals'],
    },
    {
      id: 'demo-5',
      url: 'https://www.webmd.com/healthy-aging/features/exercises-for-seniors',
      title: '10 Best Exercises for Seniors',
      description: 'Stay active and healthy with these simple exercises designed for older adults.',
      sharedAt: now - 3 * day, // 3 days ago
      sharedBy: 'aunt-mary',
      sharedByName: 'Aunt Mary',
      tags: ['health', 'fitness'],
    },
  ];
}

/**
 * Create the appropriate adapter based on environment.
 */
export function createAdapter(): BaseStorageAdapter {
  // Check if we're in demo mode (no shares.json available)
  // For now, default to demo adapter for easier testing
  if (typeof window !== 'undefined' && window.location.search.includes('demo=true')) {
    return new DemoAdapter();
  }

  // Try local file adapter first, fall back to demo
  return new LocalFileAdapter();
}
