import { describe, it, expect } from 'vitest';
import type { ShareItem, StorageAdapter, AccessibilitySettings } from './index';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from './index';

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
      sharedAt: Date.now(),
      sharedBy: 'user-456',
      sharedByName: 'Test User',
      feedId: 'feed-123',
      tags: ['test', 'example'],
    };

    expect(share.description).toBe('A test description');
    expect(share.selection).toBe('Selected text from the page');
    expect(share.sharedByName).toBe('Test User');
    expect(share.feedId).toBe('feed-123');
    expect(share.tags).toEqual(['test', 'example']);
  });
});

describe('DEFAULT_ACCESSIBILITY_SETTINGS', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.fontSize).toBe(18);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.highContrast).toBe(false);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.showThumbnails).toBe(true);
    expect(DEFAULT_ACCESSIBILITY_SETTINGS.reducedMotion).toBe(false);
  });

  it('should satisfy AccessibilitySettings type', () => {
    const settings: AccessibilitySettings = DEFAULT_ACCESSIBILITY_SETTINGS;
    expect(settings).toHaveProperty('fontSize');
    expect(settings).toHaveProperty('highContrast');
    expect(settings).toHaveProperty('showThumbnails');
    expect(settings).toHaveProperty('reducedMotion');
  });
});

describe('StorageAdapter interface', () => {
  it('should define required methods', () => {
    // This is a compile-time check
    const mockAdapter: StorageAdapter = {
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      getShares: async () => [],
      subscribeToShares: () => () => {},
    };

    expect(mockAdapter.connect).toBeTypeOf('function');
    expect(mockAdapter.disconnect).toBeTypeOf('function');
    expect(mockAdapter.isConnected).toBeTypeOf('function');
    expect(mockAdapter.getShares).toBeTypeOf('function');
    expect(mockAdapter.subscribeToShares).toBeTypeOf('function');
  });
});
