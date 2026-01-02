import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ShareItem } from '@/types';
import { LocalStorageAdapter, generateShareId } from '@/storage/local-storage';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          return { [keys]: mockStorage[keys] };
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = mockStorage[key];
        }
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
    },
  },
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    adapter = new LocalStorageAdapter();
  });

  describe('saveShare', () => {
    it('should save a share item', async () => {
      const share: ShareItem = {
        id: 'test-1',
        url: 'https://example.com',
        title: 'Test',
        sharedAt: Date.now(),
        sharedBy: 'user-1',
      };

      await adapter.saveShare(share);
      const shares = await adapter.getShares();

      expect(shares).toHaveLength(1);
      expect(shares[0]).toEqual(share);
    });

    it('should add new shares at the beginning', async () => {
      const share1: ShareItem = {
        id: 'test-1',
        url: 'https://example.com/1',
        title: 'First',
        sharedAt: 1000,
        sharedBy: 'user-1',
      };

      const share2: ShareItem = {
        id: 'test-2',
        url: 'https://example.com/2',
        title: 'Second',
        sharedAt: 2000,
        sharedBy: 'user-1',
      };

      await adapter.saveShare(share1);
      await adapter.saveShare(share2);
      const shares = await adapter.getShares();

      expect(shares).toHaveLength(2);
      expect(shares[0].id).toBe('test-2'); // Most recent first
      expect(shares[1].id).toBe('test-1');
    });
  });

  describe('getShares', () => {
    beforeEach(async () => {
      // Seed with test data
      const shares: ShareItem[] = [
        { id: '1', url: 'https://a.com', title: 'A', sharedAt: 3000, sharedBy: 'u1', feedId: 'feed1' },
        { id: '2', url: 'https://b.com', title: 'B', sharedAt: 2000, sharedBy: 'u1' },
        { id: '3', url: 'https://c.com', title: 'C', sharedAt: 1000, sharedBy: 'u1', feedId: 'feed1' },
      ];
      mockStorage['sharefeed_shares'] = shares;
    });

    it('should return all shares when no options provided', async () => {
      const shares = await adapter.getShares();
      expect(shares).toHaveLength(3);
    });

    it('should filter by feedId', async () => {
      const shares = await adapter.getShares({ feedId: 'feed1' });
      expect(shares).toHaveLength(2);
      expect(shares.every((s) => s.feedId === 'feed1')).toBe(true);
    });

    it('should apply limit', async () => {
      const shares = await adapter.getShares({ limit: 2 });
      expect(shares).toHaveLength(2);
    });

    it('should filter by timestamp for pagination', async () => {
      const shares = await adapter.getShares({ after: 2500 });
      expect(shares).toHaveLength(2);
      expect(shares.every((s) => s.sharedAt < 2500)).toBe(true);
    });
  });

  describe('getShare', () => {
    beforeEach(async () => {
      mockStorage['sharefeed_shares'] = [
        { id: 'find-me', url: 'https://found.com', title: 'Found', sharedAt: 1000, sharedBy: 'u1' },
      ];
    });

    it('should return a share by id', async () => {
      const share = await adapter.getShare('find-me');
      expect(share).not.toBeNull();
      expect(share?.title).toBe('Found');
    });

    it('should return null for non-existent id', async () => {
      const share = await adapter.getShare('not-found');
      expect(share).toBeNull();
    });
  });

  describe('deleteShare', () => {
    beforeEach(async () => {
      mockStorage['sharefeed_shares'] = [
        { id: 'keep', url: 'https://keep.com', title: 'Keep', sharedAt: 1000, sharedBy: 'u1' },
        { id: 'delete', url: 'https://delete.com', title: 'Delete', sharedAt: 2000, sharedBy: 'u1' },
      ];
    });

    it('should delete a share by id', async () => {
      await adapter.deleteShare('delete');
      const shares = await adapter.getShares();

      expect(shares).toHaveLength(1);
      expect(shares[0].id).toBe('keep');
    });

    it('should do nothing for non-existent id', async () => {
      await adapter.deleteShare('not-found');
      const shares = await adapter.getShares();

      expect(shares).toHaveLength(2);
    });
  });
});

describe('generateShareId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateShareId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate valid UUID format when crypto.randomUUID is available', () => {
    const id = generateShareId();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
