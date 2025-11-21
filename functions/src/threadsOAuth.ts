/**
 * Threads OAuth Flow - Cloud Functions
 * Handles token exchange and refresh for official Threads API
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface TokenResponse {
  access_token: string;
  user_id: string;
  expires_in?: number;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 60 days in seconds
}

/**
 * Exchange authorization code for access token
 * Step 1: Get short-lived token (1 hour)
 * Step 2: Exchange for long-lived token (60 days)
 */
export const threadsOAuthCallback = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { code, redirectUri } = data;

  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'Authorization code is required');
  }

  try {
    // Get Threads app credentials from Firebase config
    const threadsConfig = functions.config().threads;
    if (!threadsConfig || !threadsConfig.app_id || !threadsConfig.app_secret) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Threads API credentials not configured. Run: firebase functions:config:set threads.app_id="YOUR_ID" threads.app_secret="YOUR_SECRET"'
      );
    }

    const appId = threadsConfig.app_id;
    const appSecret = threadsConfig.app_secret;

    console.log('Exchanging authorization code for access token...');

    // Step 1: Exchange authorization code for short-lived access token
    const tokenExchangeUrl = 'https://graph.threads.net/oauth/access_token';
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to exchange authorization code: ${tokenResponse.status} ${errorText}`
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log('Short-lived token obtained for user:', tokenData.user_id);

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`;

    const longLivedResponse = await fetch(longLivedUrl, {
      method: 'GET',
    });

    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text();
      console.error('Long-lived token exchange failed:', errorText);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to get long-lived token: ${longLivedResponse.status} ${errorText}`
      );
    }

    const longLivedData: LongLivedTokenResponse = await longLivedResponse.json();
    console.log('Long-lived token obtained, expires in:', longLivedData.expires_in, 'seconds');

    // Calculate expiration date (60 days from now)
    const expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000);

    // Fetch user profile from Threads API
    const profileUrl = `https://graph.threads.net/v1.0/${tokenData.user_id}?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${longLivedData.access_token}`;

    const profileResponse = await fetch(profileUrl);
    let profileData: any = {};

    if (profileResponse.ok) {
      profileData = await profileResponse.json();
      console.log('Profile fetched for user:', profileData.username);
    } else {
      console.warn('Failed to fetch profile, continuing with basic data');
    }

    // Store token in Firestore
    const userId = context.auth.uid;
    const accountData = {
      threadsUserId: tokenData.user_id,
      username: profileData.username || tokenData.user_id,
      displayName: profileData.name || profileData.username || 'Threads User',
      bio: profileData.threads_biography || '',
      avatarUrl: profileData.threads_profile_picture_url || null,
      accessToken: longLivedData.access_token,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      postingMethod: 'api',
      authMethod: 'oauth', // Distinguish from legacy cookie auth
      isActive: true,
      // Analytics baseline - will be populated on first data fetch
      baselineFollowersCount: 0,
      baselineFollowingCount: 0,
      baselinePostsCount: 0,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check if account already exists
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const existingAccount = await accountsRef.where('threadsUserId', '==', tokenData.user_id).limit(1).get();

    let accountId: string;
    if (!existingAccount.empty) {
      // Update existing account
      accountId = existingAccount.docs[0].id;
      await accountsRef.doc(accountId).update({
        ...accountData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('Updated existing account:', accountId);
    } else {
      // Create new account
      const newAccount = await accountsRef.add(accountData);
      accountId = newAccount.id;
      console.log('Created new account:', accountId);
    }

    return {
      success: true,
      accountId,
      username: accountData.username,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error in threadsOAuthCallback:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to complete OAuth flow');
  }
});

/**
 * Refresh an expired or expiring access token
 * Should be called before token expires (e.g., 7 days before expiration)
 */
export const refreshThreadsToken = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accountId } = data;

  if (!accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'Account ID is required');
  }

  try {
    const userId = context.auth.uid;
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const account = accountDoc.data();
    if (!account || !account.accessToken) {
      throw new functions.https.HttpsError('failed-precondition', 'Account has no access token');
    }

    // Get Threads app secret from config
    const threadsConfig = functions.config().threads;
    if (!threadsConfig || !threadsConfig.app_secret) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Threads API secret not configured'
      );
    }

    console.log('Refreshing token for account:', accountId);

    // Refresh the long-lived token (can be done any time before expiration)
    const refreshUrl = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${account.accessToken}`;

    const refreshResponse = await fetch(refreshUrl, {
      method: 'GET',
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Token refresh failed:', errorText);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to refresh token: ${refreshResponse.status} ${errorText}`
      );
    }

    const refreshData: LongLivedTokenResponse = await refreshResponse.json();
    console.log('Token refreshed, new expiration:', refreshData.expires_in, 'seconds');

    // Calculate new expiration date
    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

    // Update account with new token
    await accountRef.update({
      accessToken: refreshData.access_token,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to refresh token');
  }
});

/**
 * Scheduled function to auto-refresh tokens that will expire within 7 days
 * Run daily to check all accounts
 */
export const autoRefreshTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Auto-refreshing expiring tokens...');

    try {
      // Get date 7 days from now
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Query all users
      const usersSnapshot = await db.collection('users').get();

      let refreshCount = 0;
      let errorCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Query accounts that expire within 7 days and use OAuth
        const accountsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('accounts')
          .where('authMethod', '==', 'oauth')
          .where('tokenExpiresAt', '<=', admin.firestore.Timestamp.fromDate(sevenDaysFromNow))
          .get();

        for (const accountDoc of accountsSnapshot.docs) {
          try {
            const account = accountDoc.data();
            console.log(`Refreshing token for account ${accountDoc.id} (expires: ${account.tokenExpiresAt?.toDate()})`);

            // Call refresh function
            const refreshUrl = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${account.accessToken}`;

            const refreshResponse = await fetch(refreshUrl);

            if (refreshResponse.ok) {
              const refreshData: LongLivedTokenResponse = await refreshResponse.json();
              const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

              await accountDoc.ref.update({
                accessToken: refreshData.access_token,
                tokenExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              refreshCount++;
              console.log(`Successfully refreshed token for account ${accountDoc.id}`);
            } else {
              const errorText = await refreshResponse.text();
              console.error(`Failed to refresh token for account ${accountDoc.id}:`, errorText);
              errorCount++;
            }
          } catch (error) {
            console.error(`Error refreshing account ${accountDoc.id}:`, error);
            errorCount++;
          }
        }
      }

      console.log(`Token refresh complete. Refreshed: ${refreshCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error('Error in autoRefreshTokens:', error);
    }
  });
