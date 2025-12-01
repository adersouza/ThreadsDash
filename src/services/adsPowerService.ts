/**
 * AdsPower Browser Automation Service
 *
 * Uses AdsPower antidetect browser profiles with Playwright
 * to post to Threads in a human-like manner.
 *
 * Benefits:
 * - Most realistic posting method (real browser)
 * - Uses unique browser fingerprints
 * - Bypasses bot detection
 * - Safer for account longevity
 *
 * Drawbacks:
 * - Slower than API method
 * - Requires AdsPower running locally
 * - More resource intensive
 */

import type { ThreadsAccount, PostingResult, AdsPowerProfile } from '@/types';
import type { Post } from '@/types/post';

// AdsPower API endpoints
const ADSPOWER_API_BASE = 'http://local.adspower.net:50325/api/v1';

interface AdsPowerStartResponse {
  code: number;
  msg: string;
  data?: {
    ws: {
      puppeteer: string;
      selenium: string;
    };
    debug_port: string;
    webdriver: string;
  };
}

interface AdsPowerProfileResponse {
  code: number;
  msg: string;
  data?: {
    list: Array<{
      user_id: string;
      name: string;
      group_name: string;
      remark: string;
    }>;
  };
}

/**
 * Random delay to simulate human behavior
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate human typing with random delays
 */
async function typeHumanLike(element: any, text: string): Promise<void> {
  for (const char of text) {
    await element.type(char, { delay: Math.random() * 100 + 50 }); // 50-150ms per char
    // Occasional longer pause (simulating thinking)
    if (Math.random() < 0.1) {
      await randomDelay(200, 500);
    }
  }
}

/**
 * Start AdsPower profile and get WebSocket endpoint
 */
export async function startAdsPowerProfile(
  profileId: string
): Promise<{ success: boolean; wsEndpoint?: string; error?: string }> {
  try {
    const response = await fetch(`${ADSPOWER_API_BASE}/browser/start?user_id=${profileId}`, {
      method: 'GET',
    });

    const data: AdsPowerStartResponse = await response.json();

    if (data.code === 0 && data.data?.ws?.puppeteer) {
      return {
        success: true,
        wsEndpoint: data.data.ws.puppeteer,
      };
    }

    return {
      success: false,
      error: data.msg || 'Failed to start AdsPower profile',
    };
  } catch (error) {
    console.error('AdsPower start error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stop AdsPower profile
 */
export async function stopAdsPowerProfile(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${ADSPOWER_API_BASE}/browser/stop?user_id=${profileId}`, {
      method: 'GET',
    });

    const data: AdsPowerStartResponse = await response.json();

    return {
      success: data.code === 0,
      error: data.code !== 0 ? data.msg : undefined,
    };
  } catch (error) {
    console.error('AdsPower stop error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get list of AdsPower profiles
 */
export async function getAdsPowerProfiles(): Promise<{
  success: boolean;
  profiles?: AdsPowerProfile[];
  error?: string;
}> {
  try {
    const response = await fetch(`${ADSPOWER_API_BASE}/user/list?page=1&page_size=100`, {
      method: 'GET',
    });

    const data: AdsPowerProfileResponse = await response.json();

    if (data.code === 0 && data.data?.list) {
      const profiles: AdsPowerProfile[] = data.data.list.map(profile => ({
        id: profile.user_id,
        name: profile.name || profile.remark || profile.user_id,
        browserType: 'chrome',
        status: 'active',
      }));

      return {
        success: true,
        profiles,
      };
    }

    return {
      success: false,
      error: data.msg || 'Failed to fetch profiles',
    };
  } catch (error) {
    console.error('AdsPower profiles error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post to Threads via AdsPower browser automation
 *
 * NOTE: This function requires Playwright to be installed and running in a Node.js environment.
 * It won't work directly in the browser. This should be called from a backend service or Cloud Function.
 */
export async function postToThreadsViaAdsPower(
  account: ThreadsAccount,
  post: Post
): Promise<PostingResult> {
  let browser: any = null;

  try {
    if (!account.adsPowerProfileId) {
      throw new Error('AdsPower profile ID not found for account');
    }

    // Start AdsPower profile
    const startResult = await startAdsPowerProfile(account.adsPowerProfileId);
    if (!startResult.success || !startResult.wsEndpoint) {
      throw new Error(startResult.error || 'Failed to start browser');
    }

    // Import Playwright dynamically (only available in Node.js)
    // This will fail in browser - needs to be called from backend
    let playwright: any;
    try {
      // @ts-ignore - playwright-core is only available in Node.js environment
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      playwright = await import(/* @vite-ignore */ 'playwright-core');
    } catch (error) {
      return {
        success: false,
        error: 'Browser automation requires a Node.js server environment. Please use the API posting method or set up a separate posting server.',
        timestamp: new Date(),
      };
    }

    // Connect to browser via CDP
    browser = await playwright.chromium.connectOverCDP(startResult.wsEndpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // Navigate to Threads
    console.log('Navigating to threads.net...');
    await page.goto('https://threads.net', { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Check if already logged in, if not, throw error
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.href.includes('/login');
    });

    if (!isLoggedIn) {
      throw new Error('Not logged in to Threads. Please log in manually in AdsPower profile first.');
    }

    // Click compose button
    console.log('Looking for compose button...');
    const composeButton = await page.waitForSelector('[aria-label="Create post"]', {
      timeout: 10000,
    });

    await randomDelay(1000, 2000);
    await composeButton.click();
    await randomDelay(1500, 2500);

    // Find the text input
    console.log('Finding text input...');
    const textInput = await page.waitForSelector('[contenteditable="true"]', {
      timeout: 10000,
    });

    // Simulate human-like mouse movement to input
    await randomDelay(500, 1000);
    await textInput.click();
    await randomDelay(300, 700);

    // Type the content with human-like delays
    console.log('Typing content...');
    await typeHumanLike(textInput, post.content);
    await randomDelay(1000, 2000);

    // Add topics/hashtags if any
    if (post.topics && post.topics.length > 0) {
      const hashtags = '\n\n' + post.topics.map(t => `#${t}`).join(' ');
      await typeHumanLike(textInput, hashtags);
      await randomDelay(500, 1000);
    }

    // Handle media uploads if present
    if (post.media && post.media.length > 0) {
      console.log('Uploading media...');
      // Find media upload button
      const mediaButton = await page.waitForSelector('input[type="file"]', {
        timeout: 5000,
      }).catch(() => null);

      if (mediaButton) {
        for (const _media of post.media) {
          // Download media from URL and upload
          // Note: This is simplified - in production you'd need to handle downloading
          await randomDelay(1000, 2000);
          // TODO: Implement media upload logic
          console.warn('Media upload not fully implemented');
        }
      }
    }

    // Apply reply settings if needed
    if (!post.settings.allowReplies || post.settings.whoCanReply !== 'everyone') {
      console.log('Adjusting reply settings...');
      // Look for settings button
      const settingsButton = await page.waitForSelector('[aria-label*="etting"], [aria-label*="Reply"]', {
        timeout: 5000,
      }).catch(() => null);

      if (settingsButton) {
        await randomDelay(500, 1000);
        await settingsButton.click();
        await randomDelay(1000, 1500);

        // Select appropriate reply setting
        if (!post.settings.allowReplies) {
          const noRepliesOption = await page.waitForSelector('text="Turn off replying"', {
            timeout: 3000,
          }).catch(() => null);
          if (noRepliesOption) await noRepliesOption.click();
        } else if (post.settings.whoCanReply === 'followers') {
          const followersOption = await page.waitForSelector('text="Followers"', {
            timeout: 3000,
          }).catch(() => null);
          if (followersOption) await followersOption.click();
        } else if (post.settings.whoCanReply === 'mentioned') {
          const mentionedOption = await page.waitForSelector('text="Mentioned only"', {
            timeout: 3000,
          }).catch(() => null);
          if (mentionedOption) await mentionedOption.click();
        }

        await randomDelay(500, 1000);
      }
    }

    // Find and click Post button
    console.log('Looking for Post button...');
    await randomDelay(1500, 2500); // Think before posting

    const postButton = await page.waitForSelector('[type="submit"]', {
      timeout: 10000,
    });

    // Final human-like delay before posting
    await randomDelay(1000, 2000);
    await postButton.click();

    // Wait for post to be published
    console.log('Waiting for post confirmation...');
    await randomDelay(3000, 5000);

    // Try to extract thread ID from URL or response
    // This is simplified - in production you'd need proper detection
    let threadId: string | undefined;

    // Check if we navigated to the new thread
    const currentUrl = page.url();
    const threadMatch = currentUrl.match(/\/post\/([A-Za-z0-9_-]+)/);
    if (threadMatch) {
      threadId = threadMatch[1];
    }

    // Close browser
    await browser.close();

    // Stop AdsPower profile
    await stopAdsPowerProfile(account.adsPowerProfileId);

    return {
      success: true,
      threadId,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('AdsPower posting error:', error);

    // Clean up browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    // Stop profile if started
    if (account.adsPowerProfileId) {
      await stopAdsPowerProfile(account.adsPowerProfileId);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Test AdsPower connection
 */
export async function testAdsPowerConnection(): Promise<{
  success: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${ADSPOWER_API_BASE}/browser/version`, {
      method: 'GET',
    });

    const data = await response.json();

    return {
      success: data.code === 0,
      version: data.data?.version,
      error: data.code !== 0 ? data.msg : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: 'AdsPower is not running. Please start AdsPower application.',
    };
  }
}

/**
 * Validate account has required setup for browser automation
 */
export function canUseBrowserMethod(account: ThreadsAccount): boolean {
  return !!(
    account.postingMethod === 'browser' &&
    account.adsPowerProfileId
  );
}
