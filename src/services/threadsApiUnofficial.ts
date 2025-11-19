/**
 * Unofficial Threads API Service
 *
 * WARNING: This uses reverse-engineered Instagram/Threads API endpoints.
 * - Not officially supported by Meta
 * - May break at any time if Meta changes their API
 * - Use at your own risk
 * - Ensure you comply with Threads Terms of Service
 *
 * This method is faster than browser automation but less safe.
 */

import type { ThreadsAccount, PostingResult } from '@/types';
import type { Post } from '@/types/post';
import { decryptSync } from './encryption';

interface InstagramLoginResponse {
  logged_in_user?: {
    pk: string;
    username: string;
    full_name: string;
  };
  status?: string;
  message?: string;
}

interface ThreadsPostResponse {
  status: string;
  media?: {
    id: string;
    code: string;
  };
  message?: string;
}

interface ThreadsInsightsResponse {
  status: string;
  media?: {
    like_count: number;
    comment_count: number;
    view_count: number;
    play_count: number;
  };
}

/**
 * Rate limiter to prevent API abuse
 */
class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, number[]> = new Map();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  canMakeRequest(accountId: string, maxPerHour: number = 3): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent requests for this account
    const recentRequests = (this.requests.get(accountId) || [])
      .filter(timestamp => timestamp > oneHourAgo);

    // Update stored requests
    this.requests.set(accountId, recentRequests);

    return recentRequests.length < maxPerHour;
  }

  recordRequest(accountId: string): void {
    const now = Date.now();
    const requests = this.requests.get(accountId) || [];
    requests.push(now);
    this.requests.set(accountId, requests);
  }

  getNextAvailableTime(accountId: string, maxPerHour: number = 3): Date | null {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentRequests = (this.requests.get(accountId) || [])
      .filter(timestamp => timestamp > oneHourAgo)
      .sort((a, b) => a - b);

    if (recentRequests.length < maxPerHour) {
      return null; // Can post now
    }

    // Next available time is 1 hour after the oldest request
    const oldestRequest = recentRequests[0];
    return new Date(oldestRequest + 60 * 60 * 1000);
  }
}

/**
 * Login to Instagram and get session token
 */
export async function loginToInstagram(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; userId?: string; error?: string }> {
  try {
    // Generate device UUID
    const deviceId = generateDeviceId();

    const response = await fetch('https://i.instagram.com/api/v1/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
        'X-IG-App-ID': '567067343352427',
        'X-IG-Device-ID': deviceId,
      },
      body: new URLSearchParams({
        username,
        password,
        device_id: deviceId,
        login_attempt_count: '0',
      }).toString(),
    });

    const data: InstagramLoginResponse = await response.json();

    if (data.logged_in_user) {
      // Extract session token from cookies
      const cookies = response.headers.get('set-cookie');
      const sessionToken = extractSessionToken(cookies);

      return {
        success: true,
        token: sessionToken,
        userId: data.logged_in_user.pk,
      };
    }

    return {
      success: false,
      error: data.message || 'Login failed',
    };
  } catch (error) {
    console.error('Instagram login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post to Threads using unofficial Instagram API
 */
export async function postToThreadsUnofficial(
  account: ThreadsAccount,
  post: Post
): Promise<PostingResult> {
  const rateLimiter = RateLimiter.getInstance();

  // Check rate limit
  if (!rateLimiter.canMakeRequest(account.id, 3)) {
    const nextAvailable = rateLimiter.getNextAvailableTime(account.id, 3);
    return {
      success: false,
      error: `Rate limit exceeded. Next available time: ${nextAvailable?.toLocaleString()}`,
      timestamp: new Date(),
    };
  }

  try {
    // Decrypt Instagram token
    if (!account.instagramToken) {
      throw new Error('Instagram token not found for account');
    }

    const token = decryptSync(account.instagramToken);
    const userId = account.instagramUserId;

    if (!userId) {
      throw new Error('Instagram user ID not found for account');
    }

    // Prepare post data
    const postData: Record<string, string> = {
      text_post_app_info: JSON.stringify({
        reply_control: post.settings.whoCanReply === 'everyone' ? 0 :
                       post.settings.whoCanReply === 'followers' ? 1 : 2,
      }),
      caption: post.content,
      source_type: '4',
    };

    // Add topics/hashtags
    if (post.topics && post.topics.length > 0) {
      postData.caption += '\n\n' + post.topics.map(t => `#${t}`).join(' ');
    }

    // Make API request
    const response = await fetch('https://i.instagram.com/api/v1/media/configure_text_only_post/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer IGT:2:${token}`,
        'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
        'X-IG-App-ID': '567067343352427',
        'X-FB-HTTP-Engine': 'Liger',
      },
      body: new URLSearchParams(postData).toString(),
    });

    const data: ThreadsPostResponse = await response.json();

    if (data.status === 'ok' && data.media) {
      // Record successful request
      rateLimiter.recordRequest(account.id);

      return {
        success: true,
        threadId: data.media.id,
        timestamp: new Date(),
      };
    }

    return {
      success: false,
      error: data.message || 'Failed to post',
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Threads API posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Get post insights/analytics from Threads
 */
export async function getThreadsPostInsights(
  account: ThreadsAccount,
  threadId: string
): Promise<{ success: boolean; insights?: any; error?: string }> {
  try {
    if (!account.instagramToken) {
      throw new Error('Instagram token not found for account');
    }

    const token = decryptSync(account.instagramToken);

    const response = await fetch(`https://i.instagram.com/api/v1/media/${threadId}/info/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer IGT:2:${token}`,
        'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
        'X-IG-App-ID': '567067343352427',
      },
    });

    const data: ThreadsInsightsResponse = await response.json();

    if (data.status === 'ok' && data.media) {
      return {
        success: true,
        insights: {
          likes: data.media.like_count || 0,
          comments: data.media.comment_count || 0,
          views: data.media.view_count || 0,
          plays: data.media.play_count || 0,
        },
      };
    }

    return {
      success: false,
      error: 'Failed to fetch insights',
    };
  } catch (error) {
    console.error('Threads insights error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility: Generate a device ID for Instagram API
 */
function generateDeviceId(): string {
  return 'android-' + Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Utility: Extract session token from cookies
 */
function extractSessionToken(cookies: string | null): string {
  if (!cookies) return '';

  const sessionMatch = cookies.match(/sessionid=([^;]+)/);
  return sessionMatch ? sessionMatch[1] : '';
}

/**
 * Validate account has required credentials for API posting
 */
export function canUseApiMethod(account: ThreadsAccount): boolean {
  return !!(
    account.postingMethod === 'api' &&
    account.instagramToken &&
    account.instagramUserId
  );
}

/**
 * Get rate limit info for account
 */
export function getRateLimitInfo(account: ThreadsAccount): {
  canPost: boolean;
  postsRemainingThisHour: number;
  nextAvailableTime: Date | null;
} {
  const rateLimiter = RateLimiter.getInstance();
  const canPost = rateLimiter.canMakeRequest(account.id, 3);
  const nextAvailableTime = rateLimiter.getNextAvailableTime(account.id, 3);

  // Calculate remaining posts
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const recentRequests = rateLimiter['requests'].get(account.id) || [];
  const recentCount = recentRequests.filter(t => t > oneHourAgo).length;
  const postsRemainingThisHour = Math.max(0, 3 - recentCount);

  return {
    canPost,
    postsRemainingThisHour,
    nextAvailableTime,
  };
}
