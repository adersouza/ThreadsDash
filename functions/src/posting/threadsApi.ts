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
 * Post to Threads using official API (OAuth)
 */
export async function postToThreadsOfficialApi(
  accessToken: string,
  threadsUserId: string,
  postData: PostData,
  accountId: string
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

  try {
    const token = await decrypt(accessToken);

    console.log('Creating Threads post container...');
    console.log('User ID:', threadsUserId);
    console.log('Token (first 10 chars):', token.substring(0, 10));
    console.log('Post content:', postData.content);

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

    // Step 1: Create post container
    const containerParams = new URLSearchParams({
      media_type: 'TEXT',
      text: postData.content,
      access_token: token,
    });

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

    return {
      success: true,
      threadId: publishData.id,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Official API error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
    };
  }
}