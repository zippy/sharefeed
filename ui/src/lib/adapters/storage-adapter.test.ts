import { describe, it, expect } from 'vitest';
import { filterShares } from './storage-adapter';
import type { ShareItem } from '$lib/types';

describe('filterShares', () => {
  const sampleShares: ShareItem[] = [
    { id: '1', url: 'https://a.com', title: 'A', sharedAt: 3000, sharedBy: 'u1', feedId: 'feed1' },
    { id: '2', url: 'https://b.com', title: 'B', sharedAt: 2000, sharedBy: 'u1' },
    { id: '3', url: 'https://c.com', title: 'C', sharedAt: 1000, sharedBy: 'u1', feedId: 'feed1' },
    { id: '4', url: 'https://d.com', title: 'D', sharedAt: 4000, sharedBy: 'u1', feedId: 'feed2' },
  ];

  it('sorts by sharedAt descending (newest first)', () => {
    const result = filterShares(sampleShares);
    expect(result[0].sharedAt).toBe(4000);
    expect(result[1].sharedAt).toBe(3000);
    expect(result[2].sharedAt).toBe(2000);
    expect(result[3].sharedAt).toBe(1000);
  });

  it('filters by feedId', () => {
    const result = filterShares(sampleShares, { feedId: 'feed1' });
    expect(result).toHaveLength(2);
    expect(result.every(s => s.feedId === 'feed1')).toBe(true);
  });

  it('returns all shares when feedId is undefined (no filter)', () => {
    const result = filterShares(sampleShares, { feedId: undefined });
    expect(result).toHaveLength(4); // undefined means "don't filter"
  });

  it('applies limit', () => {
    const result = filterShares(sampleShares, { limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('4');
    expect(result[1].id).toBe('1');
  });

  it('filters by after timestamp for pagination', () => {
    const result = filterShares(sampleShares, { after: 3000 });
    expect(result).toHaveLength(2);
    expect(result.every(s => s.sharedAt < 3000)).toBe(true);
  });

  it('combines multiple filters', () => {
    const result = filterShares(sampleShares, { feedId: 'feed1', limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array for no matches', () => {
    const result = filterShares(sampleShares, { feedId: 'nonexistent' });
    expect(result).toHaveLength(0);
  });

  it('handles empty input', () => {
    const result = filterShares([]);
    expect(result).toHaveLength(0);
  });
});
