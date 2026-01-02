import type { ShareMetadata } from '@/types';

/**
 * Extract metadata from the current page.
 * This runs in the content script context with access to the DOM.
 */
export function extractPageMetadata(): ShareMetadata {
  const url = window.location.href;
  const title = getPageTitle();
  const description = getMetaDescription();
  const ogImage = getOgImage();
  const favicon = getFaviconUrl();
  const selection = getSelectedText();

  return {
    url,
    title,
    description: description || undefined,
    ogImage: ogImage || undefined,
    favicon: favicon || undefined,
    selection: selection || undefined,
  };
}

/**
 * Get the page title, preferring og:title over document.title.
 */
function getPageTitle(): string {
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute('content');
    if (content) return content;
  }
  return document.title || 'Untitled';
}

/**
 * Get the meta description, preferring og:description over standard meta.
 */
function getMetaDescription(): string | null {
  // Try og:description first
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    const content = ogDesc.getAttribute('content');
    if (content) return content;
  }

  // Try standard meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute('content');
    if (content) return content;
  }

  // Try twitter:description
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) {
    const content = twitterDesc.getAttribute('content');
    if (content) return content;
  }

  return null;
}

/**
 * Get the Open Graph image URL.
 */
function getOgImage(): string | null {
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const content = ogImage.getAttribute('content');
    if (content) {
      // Handle relative URLs
      try {
        return new URL(content, window.location.origin).href;
      } catch {
        return content;
      }
    }
  }

  // Try twitter:image
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    const content = twitterImage.getAttribute('content');
    if (content) {
      try {
        return new URL(content, window.location.origin).href;
      } catch {
        return content;
      }
    }
  }

  return null;
}

/**
 * Get the favicon URL for the current page.
 */
function getFaviconUrl(): string | null {
  // Check for explicit favicon links
  const iconLinks = document.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );

  for (const link of iconLinks) {
    const href = link.getAttribute('href');
    if (href) {
      try {
        return new URL(href, window.location.origin).href;
      } catch {
        return href;
      }
    }
  }

  // Default to /favicon.ico
  return new URL('/favicon.ico', window.location.origin).href;
}

/**
 * Get currently selected text on the page.
 */
function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }
  return null;
}

/**
 * Convert an image URL to a base64 data URL.
 * Used for storing favicon/thumbnail as embedded data.
 */
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Create a thumbnail from a screenshot.
 * Resizes to a smaller dimension for storage efficiency.
 */
export async function createThumbnail(
  dataUrl: string,
  maxWidth: number = 300,
  maxHeight: number = 200
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate scaled dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
