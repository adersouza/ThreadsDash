/**
 * Threads API Posting Service (Cloud Functions version)
 *
 * Node.js compatible version of the unofficial Threads API service
 */

import { decrypt } from '../encryption';
import { spoofAndUploadImage, deleteTempImage } from '../utils/metadataSpoofing';

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
 * Rate limiter (in-memory - basic implementation)
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
 * Post to Threads using official API (OAuth)
 */
export async function postToThreadsOfficialApi(
  accessToken: string,
  threadsUserId: string,
  postData: PostData,
  accountId: string,
  userId?: string
): Promise<PostingResult> {
  const rateLimiter = RateLimiter.getInstance();

  if (!rateLimiter.canMakeRequest(accountId, 3)) {
    const nextAvailable = rateLimiter.getNextAvailableTime(accountId, 3);
    return {
      success: false,
      error: `Rate limit exceeded. Next available: ${nextAvailable?.toLocaleString()}`,
      timestamp: new Date(),
    };
  }

  const tempFiles: string[] = []; // Track temp files for cleanup

  try {
    const token = await decrypt(accessToken);

    // Prepare content with hashtags from topics
    let finalContent = postData.content || '';

    // Add hashtags from topics if they exist and aren't already in the content
    if (postData.topics && postData.topics.length > 0) {
      const hashtags = postData.topics
        .map(topic => {
          const originalTopic = topic.trim();
          if (!originalTopic) return null;

          // Remove spaces from hashtags (Threads doesn't support spaces in hashtags)
          // e.g., "New York" -> "NewYork" (but preserve the original topic text)
          const cleanTopic = originalTopic.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '');

          if (!cleanTopic) return null;

          const hashtagWithHash = `#${cleanTopic}`;

          // Check if hashtag or topic text already exists in content (case insensitive)
          const contentLower = finalContent.toLowerCase();
          const topicLower = originalTopic.toLowerCase();
          const hashtagLower = hashtagWithHash.toLowerCase();
          const cleanTopicLower = cleanTopic.toLowerCase();

          // Don't add if the topic or hashtag already exists in content
          // Check for:
          // 1. The hashtag: "#newyork"
          // 2. The clean topic (no spaces): "newyork" 
          // 3. The original topic text: "new york" or "New York"
          // Use word boundaries to avoid partial matches
          const cleanTopicRegex = new RegExp(`\\b${cleanTopicLower}\\b`);
          const topicWords = topicLower.split(/\s+/);
          const topicRegex = topicWords.length > 1 
            ? new RegExp(topicWords.join('\\s+'), 'i')
            : new RegExp(`\\b${topicLower}\\b`);

          if (contentLower.includes(hashtagLower) ||
              cleanTopicRegex.test(contentLower) ||
              topicRegex.test(finalContent)) {
            return null;
          }

          return hashtagWithHash;
        })
        .filter(Boolean);

      // Append hashtags to content with a newline if there are any new ones
      if (hashtags.length > 0) {
        finalContent = `${finalContent}\n\n${hashtags.join(' ')}`.trim();
      }
    }

    console.log('Creating Threads post container...');
    console.log('User ID:', threadsUserId);
    console.log('Token (first 10 chars):', token.substring(0, 10));
    console.log('Post content:', finalContent);
    console.log('Topics:', postData.topics);
    console.log('Media count:', postData.media?.length || 0);

    // First, verify the token by checking the user's permissions
    console.log('Verifying token permissions...');
    const tokenCheckUrl = `https://graph.threads.net/v1.0/${threadsUserId}?fields=id,username,threads_profile_picture_url&access_token=${token}`;
    const tokenCheckResponse = await fetch(tokenCheckUrl);
    const tokenCheckData = await tokenCheckResponse.json();
    console.log('Token verification response:', JSON.stringify(tokenCheckData));

    if (tokenCheckData.error) {
      console.error('Token verification failed:', tokenCheckData);
      return {
        success: false,
        error: `Token verification failed: ${tokenCheckData.error.message}. Please reconnect your account.`,
        timestamp: new Date(),
      };
    }

    // Step 1: Handle media if present
    let containerParams: URLSearchParams;
    const hasMedia = postData.media && postData.media.length > 0;

    if (hasMedia && userId && postData.media!.length > 1) {
      // CAROUSEL POST (multiple media items)
      console.log(`Creating carousel post with ${postData.media!.length} items`);

      const mediaContainerIds: string[] = [];

      // Create individual media containers for each item
      for (const mediaItem of postData.media!) {
        const isImage = mediaItem.type === 'image';
        let mediaUrl = mediaItem.url;

        // Spoof Firebase images
        if (isImage && mediaItem.url.includes('firebasestorage')) {
          console.log('Spoofing carousel image metadata...');
          const { url: spoofedUrl, tempPath } = await spoofAndUploadImage(mediaItem.url, userId);
          tempFiles.push(tempPath);
          mediaUrl = spoofedUrl;
        }

        const mediaType = isImage ? 'IMAGE' : 'VIDEO';
        const mediaKey = isImage ? 'image_url' : 'video_url';

        const mediaParams = new URLSearchParams({
          media_type: mediaType,
          [mediaKey]: mediaUrl,
          is_carousel_item: 'true',
          access_token: token,
        });

        console.log(`Creating media container ${mediaContainerIds.length + 1}/${postData.media!.length}`);
        const mediaContainerResponse = await fetch(
          `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
          {
            method: 'POST',
            body: mediaParams,
          }
        );

        const mediaContainerData = await mediaContainerResponse.json();

        if (!mediaContainerResponse.ok || mediaContainerData.error) {
          console.error('Media container creation error:', mediaContainerData);
          throw new Error(mediaContainerData.error?.message || 'Failed to create media container');
        }

        mediaContainerIds.push(mediaContainerData.id);
        console.log(`Media container created: ${mediaContainerData.id}`);
      }

      // Create carousel container with all media IDs
      containerParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: mediaContainerIds.join(','),
        text: finalContent,
        access_token: token,
      });

      console.log('Creating carousel container with children:', mediaContainerIds.join(','));
    } else if (hasMedia && userId) {
      // SINGLE MEDIA POST
      const firstMedia = postData.media![0];
      console.log('Processing single media:', firstMedia.url);

      // Check if it's an image (only spoof images, not videos)
      const isImage = firstMedia.type === 'image';

      if (isImage && firstMedia.url.includes('firebasestorage')) {
        // Spoof and upload the image
        console.log('Spoofing image metadata...');
        const { url: spoofedUrl, tempPath } = await spoofAndUploadImage(firstMedia.url, userId);
        tempFiles.push(tempPath);

        // Create IMAGE post with spoofed image
        containerParams = new URLSearchParams({
          media_type: 'IMAGE',
          image_url: spoofedUrl,
          text: finalContent,
          access_token: token,
        });
      } else {
        // Use original URL for non-Firebase images or videos
        const mediaType = isImage ? 'IMAGE' : 'VIDEO';
        const mediaKey = isImage ? 'image_url' : 'video_url';

        containerParams = new URLSearchParams({
          media_type: mediaType,
          [mediaKey]: firstMedia.url,
          text: finalContent,
          access_token: token,
        });
      }
    } else {
      // TEXT-ONLY POST
      containerParams = new URLSearchParams({
        media_type: 'TEXT',
        text: finalContent,
        access_token: token,
      });
    }

    // Add reply controls if specified
    if (postData.settings.whoCanReply && postData.settings.whoCanReply !== 'everyone') {
      const replyControl = postData.settings.whoCanReply === 'followers'
        ? 'accounts_you_follow'
        : 'mentioned_only';
      containerParams.append('reply_control', replyControl);
    }

    console.log('Request URL:', `https://graph.threads.net/v1.0/${threadsUserId}/threads`);
    console.log('Request params:', Array.from(containerParams.entries()).filter(([key]) => key !== 'access_token').map(([key, val]) => `${key}=${val}`).join('&'));

    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        body: containerParams,
      }
    );

    const containerData = await containerResponse.json();
    console.log('Container response:', JSON.stringify(containerData));

    if (!containerResponse.ok || containerData.error) {
      console.error('Container creation error:', containerData);
      return {
        success: false,
        error: containerData.error?.message || 'Failed to create container',
        timestamp: new Date(),
      };
    }

    const creationId = containerData.id;
    console.log('Container created:', creationId);

    // Wait for the container to be processed by Meta's servers
    // This is required - publishing immediately after creation often fails
    console.log('Waiting 3 seconds for container to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Publish the container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: token,
    });

    console.log('Publishing container...');
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        body: publishParams,
      }
    );

    const publishData = await publishResponse.json();
    console.log('Publish response:', JSON.stringify(publishData));

    if (!publishResponse.ok || publishData.error) {
      console.error('Publish error:', publishData);
      return {
        success: false,
        error: publishData.error?.message || 'Failed to publish',
        timestamp: new Date(),
      };
    }

    rateLimiter.recordRequest(accountId);

    // Clean up temp files
    for (const tempPath of tempFiles) {
      await deleteTempImage(tempPath);
    }

    return {
      success: true,
      threadId: publishData.id,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Official API error:', error);

    // Clean up temp files even if posting failed
    for (const tempPath of tempFiles) {
      await deleteTempImage(tempPath);
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
    };
  }
}