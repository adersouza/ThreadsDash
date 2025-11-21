/**
 * Threads API Posting Service (Cloud Functions version)
 *
 * Node.js compatible version of the unofficial Threads API service
 */

import { decrypt } from '../encryption';

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

    const mediaBuffer = await mediaResponse.arrayBuffer();
    const contentType = mediaResponse.headers.get('content-type') ||
                       (mediaType === 'image' ? 'image/jpeg' : 'video/mp4');

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
          'X-Entity-Length': mediaBuffer.byteLength.toString(),
          'Content-Type': contentType,
          'Offset': '0',
          'X-Instagram-Rupload-Params': JSON.stringify({
            is_sidecar: '0',
            is_threads: '1',
            media_type: mediaType === 'image' ? 1 : 2,
            upload_id: uploadId,
          }),
        },
        body: mediaBuffer,
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
 * Post to Threads using unofficial API
 */
export async function postToThreadsApi(
  instagramToken: string,
  instagramUserId: string,
  csrfToken: string,
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
    const token = await decrypt(instagramToken);
    const csrf = await decrypt(csrfToken);
    const hasMedia = postData.media && postData.media.length > 0;

    // Upload media if present (only first media item for now)
    let uploadId: string | undefined;
    if (hasMedia && postData.media) {
      const firstMedia = postData.media[0];
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
    let caption = postData.content;
    if (postData.topics && postData.topics.length > 0) {
      caption += '\n\n' + postData.topics.map(t => `#${t}`).join(' ');
    }

    // Prepare text_post_app_info
    const textPostAppInfo = {
      reply_control: postData.settings.whoCanReply === 'everyone' ? 0 :
                     postData.settings.whoCanReply === 'followers' ? 1 : 2,
      entry_point: 'sidebar_navigation',
      excluded_inline_media_ids: '[]',
      fediverse_composer_enabled: true,
      is_reply_approval_enabled: false,
      is_spoiler_media: false,
      text_with_entities: {
        entities: [],
        text: postData.content,
      },
    };

    // Prepare post data
    const apiData: Record<string, string> = {
      caption,
      text_post_app_info: JSON.stringify(textPostAppInfo),
      is_threads: 'true',
      audience: 'default',
    };

    // Add upload_id if media was uploaded
    if (uploadId) {
      apiData.upload_id = uploadId;
    }

    // Choose endpoint based on media presence
    // Threads uses Instagram's text_post_app endpoints (Threads' internal codename: Barcelona)
    const endpoint = 'https://www.instagram.com/api/v1/text_post_app_textposts/create/';

    console.log('Posting to endpoint:', endpoint);
    console.log('Post data:', JSON.stringify(apiData, null, 2));

    // Make API request to Instagram API (Threads backend)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Authorization': `Bearer IGT:2:${token}`,
        'Cookie': `sessionid=${token}; ds_user_id=${instagramUserId}; csrftoken=${csrf}`,
        'X-CSRFToken': csrf,
        'X-IG-App-ID': '238260118697367',
        'X-ASBD-ID': '359341',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.instagram.com',
        'Referer': 'https://www.instagram.com/',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Instagram-AJAX': '1',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: new URLSearchParams(apiData).toString(),
    });

    // Log response status for debugging
    console.log(`Threads API response status: ${response.status}`);

    // Check if response is OK
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Threads API error (${response.status}):`, responseText.substring(0, 500));

      return {
        success: false,
        error: `Threads API returned ${response.status}: ${response.statusText}. Your session may have expired. Please re-add your account with fresh credentials.`,
        timestamp: new Date(),
      };
    }

    // Try to parse JSON response
    let data: any;
    try {
      const responseText = await response.text();
      console.log('Threads API response:', responseText.substring(0, 500));
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse Threads API response as JSON:', jsonError);
      return {
        success: false,
        error: 'Invalid response from Threads API. Your session may have expired.',
        timestamp: new Date(),
      };
    }

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
