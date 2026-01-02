import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createThumbnail } from '@/utils/metadata';

// Note: extractPageMetadata requires DOM and is tested via integration tests
// Here we test the utility functions that can run in Node environment

describe('createThumbnail', () => {
  beforeEach(() => {
    // Mock Image for thumbnail creation
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }
    );

    // Mock canvas
    const mockContext = {
      drawImage: vi.fn(),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockContext,
            toDataURL: () => 'data:image/jpeg;base64,thumbnail',
          };
        }
        return {};
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create a thumbnail from a data URL', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const thumbnail = await createThumbnail(dataUrl);

    expect(thumbnail).not.toBeNull();
    expect(thumbnail).toContain('data:image/jpeg');
  });
});

describe('metadata extraction (unit tests)', () => {
  // These are compile-time type checks and basic validation
  // Full DOM testing requires a browser environment or JSDOM

  it('should export required functions', async () => {
    const metadata = await import('@/utils/metadata');

    expect(metadata.extractPageMetadata).toBeTypeOf('function');
    expect(metadata.imageUrlToBase64).toBeTypeOf('function');
    expect(metadata.createThumbnail).toBeTypeOf('function');
  });
});
