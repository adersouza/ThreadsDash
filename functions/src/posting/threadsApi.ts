/**
 * Threads API Posting Service (Cloud Functions version)
 *
 * Node.js compatible version of the unofficial Threads API service
 */

interface PostData {
  content: string;
  media?: any[];
  topics?: string[];
  settings: {
    allowReplies: boolean;
    whoCanReply: 'everyone' | 'followers' | 'mentioned';
  };
}

interface PostingResult {
  success: boolean;
  threadId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Rate limiter
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

    const recentRequests = (this.requests.get(accountId) || [])
      .filter(timestamp => timestamp > oneHourAgo);

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
      return null;
    }

    const oldestRequest = recentRequests[0];
    return new Date(oldestRequest + 60 * 60 * 1000);
  }
}

/**
 * Simple decryption (base64)
 * In production, use proper encryption
 */
function decrypt(encrypted: string): string {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch {
    return encrypted;
  }
}

/**
 * Generate device ID for Instagram API
 */
function generateDeviceId(): string {
  return 'android-' + Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Post to Threads using unofficial API
 */
export async function postToThreadsApi(
  instagramToken: string,
  instagramUserId: string,
  postData: PostData,
  accountId: string
): Promise<PostingResult> {
  const rateLimiter = RateLimiter.getInstance();

  // Check rate limit
  if (!rateLimiter.canMakeRequest(accountId, 3)) {
    const nextAvailable = rateLimiter.getNextAvailableTime(accountId, 3);
    return {
      success: false,
      error: `Rate limit exceeded. Next available: ${nextAvailable?.toLocaleString()}`,
      timestamp: new Date(),
    };
  }

  try {
    const token = decrypt(instagramToken);

    // Prepare post data
    const apiData: Record<string, string> = {
      text_post_app_info: JSON.stringify({
        reply_control: postData.settings.whoCanReply === 'everyone' ? 0 :
                       postData.settings.whoCanReply === 'followers' ? 1 : 2,
      }),
      caption: postData.content,
      source_type: '4',
    };

    // Add topics/hashtags
    if (postData.topics && postData.topics.length > 0) {
      apiData.caption += '\n\n' + postData.topics.map(t => `#${t}`).join(' ');
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
      body: new URLSearchParams(apiData).toString(),
    });

    const data = await response.json();

    if (data.status === 'ok' && data.media) {
      rateLimiter.recordRequest(accountId);

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
  } catch (error: any) {
    console.error('Threads API posting error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
    };
  }
}
