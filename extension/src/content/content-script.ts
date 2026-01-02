import type { ExtensionMessage, ShareMetadata } from '@/types';

/**
 * Content script that runs on all pages.
 * Handles metadata extraction and selection detection.
 */

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionMessage) => void) => {
    switch (message.type) {
      case 'GET_METADATA':
        const metadata = extractPageMetadata();
        sendResponse({ type: 'METADATA_RESPONSE', payload: metadata });
        break;

      case 'GET_SELECTION':
        const selection = getSelectedText();
        sendResponse({ type: 'SELECTION_RESPONSE', payload: selection });
        break;

      default:
        // Unknown message type, ignore
        break;
    }

    // Return true if we're sending a response asynchronously
    // In this case, we're sending synchronously
    return false;
  }
);

/**
 * Extract metadata from the current page.
 */
function extractPageMetadata(): ShareMetadata {
  return {
    url: window.location.href,
    title: getPageTitle(),
    description: getMetaDescription() || undefined,
    ogImage: getOgImage() || undefined,
    favicon: getFaviconUrl() || undefined,
    selection: getSelectedText() || undefined,
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

// Log that content script is loaded (useful for debugging)
console.log('[ShareFeed] Content script loaded');
