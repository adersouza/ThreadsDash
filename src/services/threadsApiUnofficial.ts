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
import { authenticator } from 'otplib';

interface InstagramLoginResponse {
  logged_in_user?: {
    pk: string;
    username: string;
    full_name: string;
  };
  two_factor_required?: boolean;
  two_factor_info?: {
    username: string;
    two_factor_identifier: string;
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
 * Upload media to Threads
 */
async function uploadMedia(
  token: string,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<{ success: boolean; uploadId?: string; error?: string }> {
  try {
    // Fetch the media file
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) {
      return { success: false, error: 'Failed to fetch media file' };
    }

    const mediaBlob = await mediaResponse.blob();
    const contentType = mediaBlob.type || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4');

    // Generate upload ID (timestamp)
    const uploadId = Date.now().toString();
    const entityName = `fb_uploader_${uploadId}`;

    // Upload the media
    const uploadResponse = await fetch(
      `https://www.threads.com/rupload_igphoto/${entityName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer IGT:2:${token}`,
          'X-IG-App-ID': '238260118697367',
          'X-Entity-Type': contentType,
          'X-Entity-Name': entityName,
          'X-Entity-Length': mediaBlob.size.toString(),
          'Content-Type': contentType,
          'Offset': '0',
          'X-Instagram-Rupload-Params': JSON.stringify({
            is_sidecar: '0',
            is_threads: '1',
            media_type: mediaType === 'image' ? 1 : 2,
            upload_id: uploadId,
          }),
        },
        body: mediaBlob,
      }
    );

    const uploadData = await uploadResponse.json();

    if (uploadData.status === 'ok') {
      return { success: true, uploadId };
    }

    return {
      success: false,
      error: uploadData.message || 'Failed to upload media',
    };
  } catch (error: any) {
    console.error('Media upload error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during media upload',
    };
  }
}

/**
 * Login to Instagram and get session token
 * Supports 2FA if twoFactorSecret is provided
 */
export async function loginToInstagram(
  username: string,
  password: string,
  twoFactorSecret?: string
): Promise<{ success: boolean; token?: string; userId?: string; error?: string }> {
  try {
    // Generate device UUID
    const deviceId = generateDeviceId();

    // Step 1: Initial login attempt
    const loginResponse = await fetch('https://i.instagram.com/api/v1/accounts/login/', {
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

    const loginData: InstagramLoginResponse = await loginResponse.json();

    // Check if login succeeded without 2FA
    if (loginData.logged_in_user) {
      const cookies = loginResponse.headers.get('set-cookie');
      const sessionToken = extractSessionToken(cookies);

      return {
        success: true,
        token: sessionToken,
        userId: loginData.logged_in_user.pk,
      };
    }

    // Step 2: Handle 2FA if required
    if (loginData.two_factor_required) {
      if (!twoFactorSecret) {
        return {
          success: false,
          error: '2FA code required but no 2FA secret provided. Please add your 2FA secret when setting up the account.',
        };
      }

      // Generate TOTP code from secret
      const twoFactorCode = authenticator.generate(twoFactorSecret);

      // Submit 2FA code
      const twoFactorResponse = await fetch('https://i.instagram.com/api/v1/accounts/two_factor_login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
          'X-IG-App-ID': '567067343352427',
          'X-IG-Device-ID': deviceId,
        },
        body: new URLSearchParams({
          username,
          verification_code: twoFactorCode,
          two_factor_identifier: loginData.two_factor_info?.two_factor_identifier || '',
          device_id: deviceId,
          trust_this_device: '0',
        }).toString(),
      });

      const twoFactorData: InstagramLoginResponse = await twoFactorResponse.json();

      if (twoFactorData.logged_in_user) {
        const cookies = twoFactorResponse.headers.get('set-cookie');
        const sessionToken = extractSessionToken(cookies);

        return {
          success: true,
          token: sessionToken,
          userId: twoFactorData.logged_in_user.pk,
        };
      }

      return {
        success: false,
        error: twoFactorData.message || '2FA verification failed',
      };
    }

    return {
      success: false,
      error: loginData.message || 'Login failed',
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

    const hasMedia = post.media && post.media.length > 0;

    // Upload media if present (only first media item for now)
    let uploadId: string | undefined;
    if (hasMedia) {
      const firstMedia = post.media[0];
      const mediaType = firstMedia.type || 'image';

      const uploadResult = await uploadMedia(token, firstMedia.url, mediaType);
      if (!uploadResult.success) {
        return {
          success: false,
          error: `Media upload failed: ${uploadResult.error}`,
          timestamp: new Date(),
        };
      }
      uploadId = uploadResult.uploadId;
    }

    // Prepare caption
    let caption = post.content;
    if (post.topics && post.topics.length > 0) {
      caption += '\n\n' + post.topics.map(t => `#${t}`).join(' ');
    }

    // Prepare text_post_app_info
    const textPostAppInfo = {
      reply_control: post.settings.whoCanReply === 'everyone' ? 0 :
                     post.settings.whoCanReply === 'followers' ? 1 : 2,
      entry_point: 'sidebar_navigation',
      excluded_inline_media_ids: '[]',
      fediverse_composer_enabled: true,
      is_reply_approval_enabled: false,
      is_spoiler_media: false,
      text_with_entities: {
        entities: [],
        text: post.content,
      },
    };

    // Prepare post data
    const postData: Record<string, string> = {
      caption,
      text_post_app_info: JSON.stringify(textPostAppInfo),
      is_threads: 'true',
      audience: 'default',
    };

    // Add upload_id if media was uploaded
    if (uploadId) {
      postData.upload_id = uploadId;
    }

    // Choose endpoint based on media presence
    const endpoint = hasMedia
      ? 'https://www.threads.com/api/v1/media/configure_text_post_app_feed/'
      : 'https://www.threads.com/api/v1/media/configure_text_only_post/';

    // Make API request to Threads web endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Authorization': `Bearer IGT:2:${token}`,
        'X-IG-App-ID': '238260118697367',
        'X-ASBD-ID': '359341',
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
