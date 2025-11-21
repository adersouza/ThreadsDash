/**
 * Scheduled Posts Cloud Function
 * Version: 1.1 - Updated firebase-functions to v5 for better CORS support
 *
 * Runs every minute to check for posts that need to be published.
 * Handles rate limiting and selects appropriate posting method.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { postToThreadsApi } from './posting/threadsApi';

const db = admin.firestore();

interface Post {
  id: string;
  userId: string;
  accountId: string;
  content: string;
  media: any[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: admin.firestore.Timestamp | Date | null;
  publishedAt?: admin.firestore.Timestamp | Date | null;
  topics: string[];
  settings: {
    allowReplies: boolean;
    whoCanReply: 'everyone' | 'followers' | 'mentioned';
  };
}

interface Account {
  id: string;
  userId: string;
  username: string;
  postingMethod: 'browser' | 'api';
  authMethod?: 'oauth' | 'cookies'; // OAuth vs legacy cookie auth
  accessToken?: string; // OAuth access token
  threadsUserId?: string; // Threads user ID for OAuth
  instagramToken?: string; // Legacy cookie auth
  instagramUserId?: string; // Legacy cookie auth
  csrfToken?: string; // Legacy cookie auth
  igDid?: string; // Legacy cookie auth
  mid?: string; // Legacy cookie auth
  adsPowerProfileId?: string;
  lastPostAt?: admin.firestore.Timestamp | Date;
  postsLastHour?: number;
  postsToday?: number;
  rateLimitResetAt?: admin.firestore.Timestamp | Date;
}

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  MAX_PER_HOUR: 3,
  MAX_PER_DAY: 20,
  MIN_DELAY_BETWEEN_POSTS: 15 * 60 * 1000, // 15 minutes
};

/**
 * Check if account can safely post
 */
async function canPostSafely(
  userId: string,
  accountId: string
): Promise<{ canPost: boolean; reason?: string; nextAvailableTime?: Date }> {
  const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    return { canPost: false, reason: 'Account not found' };
  }

  const account = accountDoc.data() as Account;
  const now = new Date();

  // Check minimum delay between posts
  if (account.lastPostAt) {
    const lastPostTime = account.lastPostAt instanceof admin.firestore.Timestamp
      ? account.lastPostAt.toDate()
      : new Date(account.lastPostAt);

    const timeSinceLastPost = now.getTime() - lastPostTime.getTime();

    if (timeSinceLastPost < RATE_LIMITS.MIN_DELAY_BETWEEN_POSTS) {
      const nextAvailable = new Date(
        lastPostTime.getTime() + RATE_LIMITS.MIN_DELAY_BETWEEN_POSTS
      );
      return {
        canPost: false,
        reason: 'Minimum delay between posts not met',
        nextAvailableTime: nextAvailable,
      };
    }
  }

  // Check hourly limit
  const postsLastHour = account.postsLastHour || 0;

  if (postsLastHour >= RATE_LIMITS.MAX_PER_HOUR) {
    // Reset if rate limit reset time has passed
    if (account.rateLimitResetAt) {
      const resetTime = account.rateLimitResetAt instanceof admin.firestore.Timestamp
        ? account.rateLimitResetAt.toDate()
        : new Date(account.rateLimitResetAt);

      if (now > resetTime) {
        // Reset counters
        await accountRef.update({
          postsLastHour: 0,
          rateLimitResetAt: new Date(now.getTime() + 60 * 60 * 1000),
        });
      } else {
        return {
          canPost: false,
          reason: 'Hourly rate limit exceeded',
          nextAvailableTime: resetTime,
        };
      }
    }
  }

  // Check daily limit
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const postsToday = account.postsToday || 0;

  if (postsToday >= RATE_LIMITS.MAX_PER_DAY) {
    const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    return {
      canPost: false,
      reason: 'Daily rate limit exceeded',
      nextAvailableTime: tomorrow,
    };
  }

  return { canPost: true };
}

/**
 * Update account rate limiting counters
 */
async function updateRateLimitCounters(userId: string, accountId: string): Promise<void> {
  const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) return;

  const account = accountDoc.data() as Account;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Reset daily counter if new day
  let postsToday = account.postsToday || 0;
  if (account.rateLimitResetAt) {
    const lastResetTime = account.rateLimitResetAt instanceof admin.firestore.Timestamp
      ? account.rateLimitResetAt.toDate()
      : new Date(account.rateLimitResetAt);

    if (lastResetTime < todayStart) {
      postsToday = 0;
    }
  }

  // Increment counters
  await accountRef.update({
    lastPostAt: admin.firestore.FieldValue.serverTimestamp(),
    postsLastHour: admin.firestore.FieldValue.increment(1),
    postsToday: postsToday + 1,
    rateLimitResetAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
}

/**
 * Post using API method (OAuth or legacy cookies)
 */
async function postViaApi(account: Account, post: Post): Promise<{
  success: boolean;
  threadId?: string;
  error?: string;
}> {
  console.log(`Posting via API for account ${account.username}`);
  console.log(`Content: ${post.content}`);

  try {
    let result: any;

    // Route to appropriate API based on auth method
    if (account.authMethod === 'oauth' && account.accessToken) {
      // Use official Threads API with OAuth token
      console.log('Using official Threads API (OAuth)');
      const { postToThreadsApiOfficial } = await import('./posting/threadsApiOfficial');

      result = await postToThreadsApiOfficial(
        account.accessToken,
        account.threadsUserId!,
        {
          content: post.content,
          media: post.media,
          topics: post.topics,
          settings: post.settings,
        }
      );
    } else {
      // Use legacy unofficial API with cookies (backward compatibility)
      console.log('Using legacy unofficial API (cookies)');

      // Validate legacy credentials
      if (!account.instagramToken || !account.instagramUserId) {
        return {
          success: false,
          error: 'Account credentials not configured. Please reconnect your account using OAuth.',
        };
      }

      result = await postToThreadsApi(
        account.instagramToken,
        account.instagramUserId,
        account.csrfToken || '',
        account.igDid || '',
        account.mid || '',
        {
          content: post.content,
          media: post.media,
          topics: post.topics,
          settings: post.settings,
        },
        account.id
      );
    }

    return result;
  } catch (error: any) {
    console.error('Error posting via API:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Post using browser automation method
 *
 * NOTE: Browser automation cannot run in Cloud Functions.
 * To use this method, you need to:
 * 1. Deploy a separate server with AdsPower and Playwright
 * 2. Create an HTTP endpoint on that server
 * 3. Call that endpoint from here
 */
async function postViaBrowser(account: Account, post: Post): Promise<{
  success: boolean;
  threadId?: string;
  error?: string;
}> {
  console.log(`Posting via browser for account ${account.username}`);
  console.log(`Content: ${post.content}`);

  try {
    // Browser automation requires a separate server
    // Cloud Functions cannot run headless browsers with displays

    // Example implementation if you have a posting server:
    // const response = await fetch('https://your-posting-server.com/api/post', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     profileId: account.adsPowerProfileId,
    //     content: post.content,
    //     media: post.media,
    //     topics: post.topics,
    //     settings: post.settings,
    //   }),
    // });
    // return await response.json();

    return {
      success: false,
      error: 'Browser automation requires a separate server. Please use API method or deploy a posting server.',
    };
  } catch (error: any) {
    console.error('Error posting via browser:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Process a single scheduled post
 */
async function processPost(userId: string, postId: string): Promise<void> {
  const postRef = db.collection('users').doc(userId).collection('posts').doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    console.log(`Post ${postId} not found`);
    return;
  }

  const post = { id: postDoc.id, ...postDoc.data() } as Post;

  // Get account details
  const accountRef = db.collection('users').doc(userId).collection('accounts').doc(post.accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    console.log(`Account ${post.accountId} not found`);
    await postRef.update({
      status: 'failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const account = { id: accountDoc.id, ...accountDoc.data() } as Account;

  // Check if can post safely
  const safetyCheck = await canPostSafely(userId, post.accountId);
  if (!safetyCheck.canPost) {
    console.log(`Cannot post safely: ${safetyCheck.reason}`);

    // Reschedule for next available time if specified
    if (safetyCheck.nextAvailableTime) {
      await postRef.update({
        scheduledFor: admin.firestore.Timestamp.fromDate(safetyCheck.nextAvailableTime),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return;
  }

  // Post using appropriate method
  let result: { success: boolean; threadId?: string; error?: string };

  if (account.postingMethod === 'api') {
    result = await postViaApi(account, post);
  } else if (account.postingMethod === 'browser') {
    result = await postViaBrowser(account, post);
  } else {
    console.log(`Unknown posting method: ${account.postingMethod}`);
    await postRef.update({
      status: 'failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Update post status
  if (result.success) {
    await postRef.update({
      status: 'published',
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update rate limit counters
    await updateRateLimitCounters(userId, post.accountId);

    console.log(`Post ${postId} published successfully`);

    // Log activity
    await db.collection('users').doc(userId).collection('activity').add({
      type: 'post_published',
      postId: postId,
      accountId: post.accountId,
      threadId: result.threadId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await postRef.update({
      status: 'failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Post ${postId} failed: ${result.error}`);

    // Log error
    await db.collection('users').doc(userId).collection('activity').add({
      type: 'post_failed',
      postId: postId,
      accountId: post.accountId,
      error: result.error,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Scheduled function that runs every minute
 * Checks for posts that need to be published
 */
export const processScheduledPosts = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('Processing scheduled posts...');

    const now = admin.firestore.Timestamp.now();

    try {
      // Query all users
      const usersSnapshot = await db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Query scheduled posts for this user
        const postsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('posts')
          .where('status', '==', 'scheduled')
          .where('scheduledFor', '<=', now)
          .limit(10) // Process max 10 posts per run per user
          .get();

        console.log(`Found ${postsSnapshot.size} posts to process for user ${userId}`);

        // Process each post
        for (const postDoc of postsSnapshot.docs) {
          try {
            await processPost(userId, postDoc.id);
          } catch (error) {
            console.error(`Error processing post ${postDoc.id}:`, error);
          }
        }
      }

      console.log('Scheduled posts processing completed');
    } catch (error) {
      console.error('Error in processScheduledPosts:', error);
    }
  });

/**
 * HTTP callable function to publish a post immediately
 * Can be triggered from the frontend
 */
export const publishPostNow = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const postId = data.postId;

  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'postId is required');
  }

  try {
    // Process the post immediately
    await processPost(userId, postId);

    return {
      success: true,
      message: 'Post published successfully',
    };
  } catch (error: any) {
    console.error('Error in publishPostNow:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to publish post');
  }
});
