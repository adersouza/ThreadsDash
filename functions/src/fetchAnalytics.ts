/**
 * Fetch Analytics from Threads API
 *
 * Scheduled function that runs daily to fetch insights and metrics
 * from the Threads Graph API and store them in Firestore
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { decrypt } from './encryption';

// Lazy initialization to avoid timeout during deployment
function getDb() {
  return admin.firestore();
}

interface ThreadsPost {
  id: string;
  text: string;
  timestamp: string;
  permalink: string;
}

interface PostInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

interface ThreadsProfile {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
}

/**
 * Fetch posts and their individual insights
 */
async function fetchPostsWithInsights(
  threadsUserId: string,
  token: string,
  limit: number = 25
): Promise<{ posts: ThreadsPost[]; insights: Map<string, PostInsights> }> {
  const posts: ThreadsPost[] = [];
  const insights = new Map<string, PostInsights>();

  try {
    // Fetch user's posts
    const postsUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads?fields=id,text,timestamp,permalink&limit=${limit}&access_token=${token}`;
    const postsResponse = await fetch(postsUrl);
    const postsData = await postsResponse.json();

    if (!postsResponse.ok || postsData.error) {
      console.error('Failed to fetch posts:', postsData.error);
      return { posts, insights };
    }

    if (!postsData.data || !Array.isArray(postsData.data)) {
      return { posts, insights };
    }

    posts.push(...postsData.data);

    // Fetch insights for each post
    for (const post of posts) {
      try {
        const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`;
        const insightsResponse = await fetch(insightsUrl);
        const insightsData = await insightsResponse.json();

        if (!insightsResponse.ok || insightsData.error) {
          console.error(`Failed to fetch insights for post ${post.id}:`, insightsData.error);
          continue;
        }

        const postInsights: PostInsights = {
          views: 0,
          likes: 0,
          replies: 0,
          reposts: 0,
          quotes: 0,
        };

        if (insightsData.data && Array.isArray(insightsData.data)) {
          insightsData.data.forEach((metric: any) => {
            const name = metric.name;
            let value = 0;

            if (metric.total_value && typeof metric.total_value.value !== 'undefined') {
              value = metric.total_value.value;
            } else if (metric.values && Array.isArray(metric.values) && metric.values.length > 0) {
              value = metric.values[metric.values.length - 1].value;
            }

            if (name in postInsights) {
              postInsights[name as keyof PostInsights] = value;
            }
          });
        }

        insights.set(post.id, postInsights);

        // Rate limit: wait 100ms between post insight requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`Error fetching insights for post ${post.id}:`, error.message);
      }
    }

    console.log(`Fetched ${posts.length} posts with insights`);
  } catch (error: any) {
    console.error('Error in fetchPostsWithInsights:', error.message);
  }

  return { posts, insights };
}

/**
 * Fetch profile and insights for a single account
 */
async function fetchAccountInsights(
  userId: string,
  accountId: string,
  threadsUserId: string,
  accessToken: string
): Promise<void> {
  try {
    const token = await decrypt(accessToken);

    // Fetch profile data (includes followers_count)
    const profileUrl = `https://graph.threads.net/v1.0/${threadsUserId}?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${token}`;
    const profileResponse = await fetch(profileUrl);
    const profileData: ThreadsProfile = await profileResponse.json();

    if (!profileResponse.ok || (profileData as any).error) {
      console.error(`Failed to fetch profile for account ${accountId}:`, (profileData as any).error);
      return;
    }

    // Fetch account-level insights (only followers_count is useful here)
    const accountInsightsUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_insights?metric=followers_count&access_token=${token}`;
    const accountInsightsResponse = await fetch(accountInsightsUrl);
    const accountInsightsData = await accountInsightsResponse.json();

    let followersCount = 0;
    if (accountInsightsData.data && Array.isArray(accountInsightsData.data)) {
      const followerMetric = accountInsightsData.data.find((m: any) => m.name === 'followers_count');
      if (followerMetric) {
        if (followerMetric.total_value && typeof followerMetric.total_value.value !== 'undefined') {
          followersCount = followerMetric.total_value.value;
        } else if (followerMetric.values && Array.isArray(followerMetric.values) && followerMetric.values.length > 0) {
          followersCount = followerMetric.values[followerMetric.values.length - 1].value;
        }
      }
    }

    // Fetch posts and their individual insights
    const { posts, insights: postInsights } = await fetchPostsWithInsights(threadsUserId, token, 100);

    // Aggregate insights from all posts
    let totalViews = 0;
    let totalLikes = 0;
    let totalReplies = 0;
    let totalReposts = 0;
    let totalQuotes = 0;

    for (const [, metrics] of postInsights) {
      totalViews += metrics.views;
      totalLikes += metrics.likes;
      totalReplies += metrics.replies;
      totalReposts += metrics.reposts;
      totalQuotes += metrics.quotes;
    }

    console.log('Aggregated insights:', {
      followersCount,
      postsCount: posts.length,
      totalViews,
      totalLikes,
      totalReplies,
      totalReposts,
      totalQuotes,
    });

    // Update account document with latest data
    const accountRef = getDb().collection('users').doc(userId).collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();
    const accountData = accountDoc.data();

    const previousFollowersCount = accountData?.followersCount || 0;
    const followersGained = Math.max(0, followersCount - previousFollowersCount);
    const followersLost = Math.max(0, previousFollowersCount - followersCount);

    await accountRef.update({
      username: profileData.username,
      profilePictureUrl: profileData.threads_profile_picture_url || null,
      bio: profileData.threads_biography || '',
      followersCount: followersCount,
      postsCount: posts.length,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store daily analytics snapshot
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analyticsRef = getDb()
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(accountId)
      .collection('analytics')
      .doc(today.toISOString().split('T')[0]); // Use date as document ID

    await analyticsRef.set({
      accountId,
      date: admin.firestore.Timestamp.fromDate(today),
      followersCount,
      followersGained,
      followersLost,
      views: totalViews,
      likes: totalLikes,
      replies: totalReplies,
      reposts: totalReposts,
      quotes: totalQuotes,
      postsCount: posts.length,
      engagementRate: totalViews > 0 ? (totalLikes + totalReplies + totalReposts) / totalViews : 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store individual posts with their performance metrics
    const batch = getDb().batch();
    let batchCount = 0;
    const MAX_BATCH = 500;

    for (const post of posts) {
      const postMetrics = postInsights.get(post.id);
      if (!postMetrics) continue;

      const postRef = getDb().collection('users').doc(userId).collection('posts').doc(post.id);
      const engagementRate = postMetrics.views > 0
        ? (postMetrics.likes + postMetrics.replies + postMetrics.reposts) / postMetrics.views
        : 0;

      batch.set(
        postRef,
        {
          accountId,
          threadsPostId: post.id,
          content: post.text,
          permalink: post.permalink,
          publishedAt: admin.firestore.Timestamp.fromDate(new Date(post.timestamp)),
          status: 'published',
          performance: {
            views: postMetrics.views,
            likes: postMetrics.likes,
            replies: postMetrics.replies,
            reposts: postMetrics.reposts,
            quotes: postMetrics.quotes,
            engagementRate,
          },
          lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      batchCount++;

      // Commit batch if we reach the limit
      if (batchCount >= MAX_BATCH) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit any remaining writes
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Stored ${posts.length} posts with performance metrics`);

    console.log(`✅ Analytics updated for account ${accountId} (${profileData.username})`);
  } catch (error: any) {
    console.error(`Error fetching insights for account ${accountId}:`, error.message);
  }
}

/**
 * Fetch analytics for all accounts
 * Runs daily at 2 AM UTC
 */
export const fetchDailyAnalytics = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🔄 Starting daily analytics fetch...');

    try {
      // Get all users
      const usersSnapshot = await getDb().collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Get all accounts for this user
        const accountsSnapshot = await getDb()
          .collection('users')
          .doc(userId)
          .collection('accounts')
          .where('threadsAccessToken', '!=', null)
          .get();

        console.log(`Found ${accountsSnapshot.size} accounts for user ${userId}`);

        for (const accountDoc of accountsSnapshot.docs) {
          const accountData = accountDoc.data();
          const accountId = accountDoc.id;

          if (!accountData.threadsAccessToken || !accountData.threadsUserId) {
            console.log(`⏭️  Skipping account ${accountId} - no OAuth credentials`);
            continue;
          }

          await fetchAccountInsights(
            userId,
            accountId,
            accountData.threadsUserId,
            accountData.threadsAccessToken
          );

          // Rate limit: wait 1 second between accounts
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('✅ Daily analytics fetch completed');
    } catch (error: any) {
      console.error('Error in daily analytics fetch:', error);
    }
  });

/**
 * Manually trigger analytics fetch for a single account
 * Callable function for immediate refresh
 */
export const refreshAccountAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accountId } = data;
  if (!accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'accountId is required');
  }

  const userId = context.auth.uid;

  try {
    // Get account data
    const accountRef = getDb().collection('users').doc(userId).collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const accountData = accountDoc.data();
    if (!accountData) {
      throw new functions.https.HttpsError('not-found', 'Account data not found');
    }

    if (!accountData.threadsAccessToken || !accountData.threadsUserId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Account does not have OAuth credentials'
      );
    }

    await fetchAccountInsights(
      userId,
      accountId,
      accountData.threadsUserId,
      accountData.threadsAccessToken
    );

    return { success: true, message: 'Analytics refreshed successfully' };
  } catch (error: any) {
    console.error('Error refreshing account analytics:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to refresh analytics');
  }
});
