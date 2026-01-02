import { describe, it, expect } from 'vitest';
import type { ShareItem, ShareMetadata, StorageAdapter } from '@/types';

describe('ShareItem type', () => {
  it('should have all required fields', () => {
    const share: ShareItem = {
      id: 'test-id-123',
      url: 'https://example.com/article',
      title: 'Test Article',
      sharedAt: Date.now(),
      sharedBy: 'user-123',
    };

    expect(share.id).toBe('test-id-123');
    expect(share.url).toBe('https://example.com/article');
    expect(share.title).toBe('Test Article');
    expect(share.sharedAt).toBeTypeOf('number');
    expect(share.sharedBy).toBe('user-123');
  });

  it('should allow optional fields', () => {
    const share: ShareItem = {
      id: 'test-id-456',
      url: 'https://example.com/page',
      title: 'Test Page',
      description: 'A test description',
      selection: 'Selected text from the page',
      favicon: 'data:image/png;base64,abc123',
      thumbnail: 'data:image/jpeg;base64,xyz789',
      sharedAt: Date.now(),
      sharedBy: 'user-456',
      feedId: 'feed-123',
      tags: ['test', 'example'],
    };

    expect(share.description).toBe('A test description');
    expect(share.selection).toBe('Selected text from the page');
    expect(share.favicon).toContain('data:image/png');
    expect(share.thumbnail).toContain('data:image/jpeg');
    expect(share.feedId).toBe('feed-123');
    expect(share.tags).toEqual(['test', 'example']);
  });
});

describe('ShareMetadata type', () => {
  it('should have required url and title fields', () => {
    const metadata: ShareMetadata = {
      url: 'https://example.com',
      title: 'Example Site',
    };

    expect(metadata.url).toBe('https://example.com');
    expect(metadata.title).toBe('Example Site');
  });

  it('should allow all optional fields', () => {
    const metadata: ShareMetadata = {
      url: 'https://example.com/article',
      title: 'Great Article',
      description: 'This is a great article about testing',
      favicon: 'https://example.com/favicon.ico',
      ogImage: 'https://example.com/og-image.jpg',
      selection: 'Important quote from the article',
    };

    expect(metadata.description).toBe('This is a great article about testing');
    expect(metadata.favicon).toContain('favicon.ico');
    expect(metadata.ogImage).toContain('og-image.jpg');
    expect(metadata.selection).toBe('Important quote from the article');
  });
});

describe('StorageAdapter interface', () => {
  it('should define required methods', () => {
    // This is a compile-time check - if the interface changes, this test should fail
    const mockAdapter: StorageAdapter = {
      saveShare: async (_share: ShareItem) => {},
      getShares: async () => [],
      deleteShare: async (_id: string) => {},
      getShare: async (_id: string) => null,
    };

    expect(mockAdapter.saveShare).toBeTypeOf('function');
    expect(mockAdapter.getShares).toBeTypeOf('function');
    expect(mockAdapter.deleteShare).toBeTypeOf('function');
    expect(mockAdapter.getShare).toBeTypeOf('function');
  });
});
