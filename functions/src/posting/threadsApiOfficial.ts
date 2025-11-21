/**
 * Official Threads API Implementation
 * Uses Meta's official Threads API with OAuth tokens
 * Documentation: https://developers.facebook.com/docs/threads
 */

export interface PostData {
  content: string;
  media?: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
  topics?: string[];
  settings?: {
    allowReplies: boolean;
    whoCanReply: 'everyone' | 'followers' | 'mentioned';
  };
}

export interface PostingResult {
  success: boolean;
  threadId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Post to Threads using official API with OAuth token
 *
 * Process:
 * 1. Create a media container (threads endpoint)
 * 2. Publish the container (threads_publish endpoint)
 */
export async function postToThreadsApiOfficial(
  accessToken: string,
  threadsUserId: string,
  postData: PostData
): Promise<PostingResult> {
  try {
    console.log('Posting to Threads via official API for user:', threadsUserId);
    console.log('Content:', postData.content);

    // Step 1: Create media container
    const containerId = await createMediaContainer(accessToken, threadsUserId, postData);

    if (!containerId) {
      return {
        success: false,
        error: 'Failed to create media container',
        timestamp: new Date(),
      };
    }

    console.log('Media container created:', containerId);

    // Step 2: Publish the container
    const threadId = await publishContainer(accessToken, threadsUserId, containerId);

    if (!threadId) {
      return {
        success: false,
        error: 'Failed to publish container',
        timestamp: new Date(),
      };
    }

    console.log('Thread published successfully:', threadId);

    return {
      success: true,
      threadId,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Error posting to Threads:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date(),
    };
  }
}

/**
 * Step 1: Create a media container
 * This stages the post but doesn't publish it yet
 */
async function createMediaContainer(
  accessToken: string,
  threadsUserId: string,
  postData: PostData
): Promise<string | null> {
  try {
    const endpoint = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;

    // Build request parameters
    const params: any = {
      access_token: accessToken,
      text: postData.content,
    };

    // Handle media (single image or video for now)
    if (postData.media && postData.media.length > 0) {
      const firstMedia = postData.media[0];

      if (firstMedia.type === 'image') {
        params.media_type = 'IMAGE';
        params.image_url = firstMedia.url;
      } else if (firstMedia.type === 'video') {
        params.media_type = 'VIDEO';
        params.video_url = firstMedia.url;
      }
    } else {
      // Text-only post
      params.media_type = 'TEXT';
    }

    // Build URL with query parameters
    const url = new URL(endpoint);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log('Creating media container:', url.toString().replace(accessToken, 'REDACTED'));

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create media container:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.id || null;
  } catch (error: any) {
    console.error('Error creating media container:', error);
    throw error;
  }
}

/**
 * Step 2: Publish the media container
 * This makes the post visible on Threads
 */
async function publishContainer(
  accessToken: string,
  threadsUserId: string,
  containerId: string
): Promise<string | null> {
  try {
    const endpoint = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;

    // Build URL with query parameters
    const url = new URL(endpoint);
    url.searchParams.append('access_token', accessToken);
    url.searchParams.append('creation_id', containerId);

    console.log('Publishing container:', containerId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to publish container:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.id || null;
  } catch (error: any) {
    console.error('Error publishing container:', error);
    throw error;
  }
}

/**
 * Get user profile information
 * Useful for fetching analytics and profile data
 */
export async function getThreadsProfile(
  accessToken: string,
  threadsUserId: string
): Promise<any> {
  try {
    const fields = 'id,username,name,threads_profile_picture_url,threads_biography';
    const url = `https://graph.threads.net/v1.0/${threadsUserId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch profile:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Get threads (posts) for a user
 * Useful for fetching user's posts and analytics
 */
export async function getThreadsPosts(
  accessToken: string,
  threadsUserId: string,
  limit: number = 25
): Promise<any[]> {
  try {
    const fields = 'id,text,timestamp,media_type,media_url,permalink,is_reply,replies_count,likes_count,views';
    const url = `https://graph.threads.net/v1.0/${threadsUserId}/threads?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch posts:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Get insights/analytics for a thread
 * Includes views, likes, replies, reposts, quotes, etc.
 */
export async function getThreadInsights(
  accessToken: string,
  threadId: string
): Promise<any> {
  try {
    const metrics = 'views,likes,replies,reposts,quotes,followers_count';
    const url = `https://graph.threads.net/v1.0/${threadId}/insights?metric=${metrics}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch insights:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching insights:', error);
    return null;
  }
}

/**
 * Reply to a thread
 */
export async function replyToThread(
  accessToken: string,
  threadsUserId: string,
  parentThreadId: string,
  replyText: string
): Promise<PostingResult> {
  try {
    // Step 1: Create reply container
    const endpoint = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    const url = new URL(endpoint);
    url.searchParams.append('access_token', accessToken);
    url.searchParams.append('media_type', 'TEXT');
    url.searchParams.append('text', replyText);
    url.searchParams.append('reply_to_id', parentThreadId);

    const createResponse = await fetch(url.toString(), {
      method: 'POST',
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create reply: ${errorText}`);
    }

    const createData = await createResponse.json();
    const containerId = createData.id;

    // Step 2: Publish reply
    const threadId = await publishContainer(accessToken, threadsUserId, containerId);

    return {
      success: true,
      threadId: threadId || undefined,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Error replying to thread:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}
