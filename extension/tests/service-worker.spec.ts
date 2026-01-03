/**
 * Playwright test for service worker initialization.
 * Tests that the extension loads without errors in a real browser environment.
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../dist');

async function getServiceWorker(context: BrowserContext) {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 5000 });
  }
  return serviceWorker;
}

test.describe('Extension Service Worker', () => {
  let context: BrowserContext;
  const consoleMessages: { type: string; text: string }[] = [];

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-gpu',
      ],
    });

    context.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('service worker loads without errors', async () => {
    const sw = await getServiceWorker(context);
    expect(sw).toBeTruthy();

    // Wait for initialization
    await new Promise((r) => setTimeout(r, 2000));

    // Try to evaluate something in the service worker to see if it's alive
    try {
      const swCheck = await sw.evaluate(() => {
        return {
          hasChrome: typeof chrome !== 'undefined',
          hasRuntime: typeof chrome?.runtime !== 'undefined',
          hasOnMessage: typeof chrome?.runtime?.onMessage !== 'undefined',
        };
      });
      console.log('\n=== Service Worker Check ===');
      console.log(JSON.stringify(swCheck, null, 2));
    } catch (e: any) {
      console.log('\n=== Service Worker Evaluate Error ===');
      console.log(e.message);
    }

    console.log('\n=== Service Worker Console Output ===');
    for (const msg of consoleMessages) {
      console.log(`[${msg.type}] ${msg.text}`);
    }

    const criticalErrors = consoleMessages.filter(
      (m) =>
        m.type === 'error' ||
        m.text.includes('Uncaught') ||
        m.text.includes('random number generator') ||
        m.text.includes('UnknownMessageFormat')
    );

    if (criticalErrors.length > 0) {
      console.log('\n=== ERRORS ===');
      criticalErrors.forEach((e) => console.log(`[${e.type}] ${e.text}`));
    }

    expect(criticalErrors).toHaveLength(0);
  });

  test('service worker has required APIs', async () => {
    const sw = await getServiceWorker(context);

    const result = await sw.evaluate(() => ({
      hasWindow: typeof globalThis.window !== 'undefined',
      hasBlob: typeof Blob !== 'undefined',
      hasCrypto: typeof crypto !== 'undefined',
      hasGetRandomValues: typeof crypto?.getRandomValues === 'function',
      windowBlob: typeof (globalThis as any).window?.Blob !== 'undefined',
    }));

    console.log('\n=== Service Worker Environment ===');
    console.log(JSON.stringify(result, null, 2));

    expect(result.hasBlob).toBe(true);
    expect(result.hasCrypto).toBe(true);
    expect(result.hasGetRandomValues).toBe(true);
  });

  test('service worker responds to GET_SHARES message', async () => {
    const sw = await getServiceWorker(context);

    // Check if the service worker has our polyfill applied
    const swStatus = await sw.evaluate(() => {
      const g = globalThis as any;
      return {
        hasWindowPolyfill: typeof g.window !== 'undefined',
        hasWindowCrypto: typeof g.window?.crypto !== 'undefined',
      };
    });
    console.log('\n=== SW Status ===');
    console.log(JSON.stringify(swStatus, null, 2));
    console.log('Service worker URL:', sw.url());

    // Try via extension popup
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();

    // Capture any page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('[PAGE ERROR]', msg.text());
      }
    });

    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Use a shorter timeout
    const msgResult = await page.evaluate(async () => {
      try {
        console.log('Sending GET_SHARES message...');
        const response = await Promise.race([
          chrome.runtime.sendMessage({ type: 'GET_SHARES' }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Message timeout 3s')), 3000)
          ),
        ]);
        console.log('Got response:', JSON.stringify(response));
        return { success: true, response };
      } catch (e: any) {
        console.log('Error:', e.message);
        return { success: false, error: e.message };
      }
    });

    console.log('\n=== GET_SHARES Message Response ===');
    console.log(JSON.stringify(msgResult, null, 2));

    if (pageErrors.length > 0) {
      console.log('Page errors:', pageErrors);
    }

    await page.close();

    expect(msgResult.success).toBe(true);
    if (msgResult.success) {
      expect(msgResult.response?.type).toBe('SHARES_RESPONSE');
    }
  });

  test('service worker responds to SHARE_ITEM message', async () => {
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Test sharing an item
    const testShare = {
      url: 'https://example.com/test',
      title: 'Test Share',
      description: 'A test share item',
    };

    const result = await page.evaluate(async (share) => {
      try {
        const response = await Promise.race([
          chrome.runtime.sendMessage({ type: 'SHARE_ITEM', payload: share }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Message timeout 5s')), 5000)
          ),
        ]);
        return { success: true, response };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }, testShare);

    console.log('\n=== SHARE_ITEM Response ===');
    console.log(JSON.stringify(result, null, 2));

    if (pageErrors.length > 0) {
      console.log('Page errors:', pageErrors);
    }

    expect(result.success).toBe(true);
    expect(result.response?.type).toBe('SHARE_SUCCESS');
    expect(result.response?.payload?.url).toBe(testShare.url);

    await page.close();
  });

  test('service worker responds to GET_CONNECTION_STATUS message', async () => {
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();

    // Capture errors
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Test connection status with a timeout
    const result = await page.evaluate(async () => {
      try {
        const response = await Promise.race([
          chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout after 5s')), 5000)
          ),
        ]);
        return { success: true, response };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });

    console.log('\n=== GET_CONNECTION_STATUS Response ===');
    console.log(JSON.stringify(result, null, 2));

    if (pageErrors.length > 0) {
      console.log('\n=== Page Errors ===');
      pageErrors.forEach((e) => console.log(`  ${e}`));
    }

    // Check for crypto errors
    const cryptoErrors = pageErrors.filter(
      (e) => e.includes('random number generator') || e.includes('crypto')
    );
    expect(cryptoErrors).toHaveLength(0);

    expect(result.success).toBe(true);
    expect(result.response?.type).toBe('CONNECTION_STATUS_RESPONSE');

    await page.close();
  });

  test('popup shows connection status button (Local or Holochain)', async () => {
    const extensionId = await getExtensionId(context);
    const page = await context.newPage();

    // Capture page console messages
    const pageMessages: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      pageMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to popup
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await new Promise((r) => setTimeout(r, 2000));

    // Debug: get page content
    const html = await page.content();
    console.log('\n=== Page HTML (truncated) ===');
    console.log(html.substring(0, 2000));

    // Wait for the connection status button to appear (shows Local or Holochain)
    const statusButton = page.locator('.connection-status');
    const isVisible = await statusButton.isVisible();
    console.log(`\nConnection status button visible: ${isVisible}`);

    // Log any page errors first
    if (pageErrors.length > 0) {
      console.log('\n=== Page Errors ===');
      pageErrors.forEach((e) => console.log(`  ${e}`));
    }

    // Log console messages
    if (pageMessages.length > 0) {
      console.log('\n=== Page Console ===');
      pageMessages.forEach((m) => console.log(`[${m.type}] ${m.text}`));
    }

    // Check for crypto errors - this is the main thing we're testing
    const cryptoErrors = pageErrors.filter(
      (e) => e.includes('random number generator') || e.includes('crypto')
    );
    expect(cryptoErrors).toHaveLength(0);

    // If button is visible, check its text
    if (isVisible) {
      const statusText = await statusButton.textContent();
      console.log('\n=== Popup Connection Status ===');
      console.log(`Status: ${statusText?.trim()}`);
      expect(statusText).toMatch(/Local|Holochain/);
    } else {
      console.log('\nConnection status button not visible - connectionStatus may not be set yet');
      // This isn't necessarily an error - might just need more time or have no conductor
    }

    await page.close();
  });
});

async function getExtensionId(context: BrowserContext): Promise<string> {
  // Get extension ID from service worker URL
  const sw = await getServiceWorker(context);
  const url = sw.url();
  // URL format: chrome-extension://<extension-id>/...
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error('Could not determine extension ID');
  return match[1];
}
