import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { encrypt } from '../encryption';

const THREADS_APP_ID = '1620825335945838';
const THREADS_APP_SECRET = functions.config().threads?.app_secret || process.env.THREADS_APP_SECRET;
const REDIRECT_URI = 'https://threadsdash.web.app/auth/threads/callback';

interface ThreadsTokenResponse {
  access_token: string;
  user_id: string;
  expires_in?: number;
}

interface ThreadsUserProfileResponse {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
}

/**
 * Exchange authorization code for access token
 */
export const exchangeThreadsToken = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { code } = data;

  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'Authorization code is required');
  }

  if (!THREADS_APP_SECRET) {
    throw new functions.https.HttpsError('internal', 'Threads app secret not configured');
  }

  try {
    // Step 1: Exchange code for short-lived access token
    const tokenUrl = `https://graph.threads.net/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: THREADS_APP_ID,
      client_secret: THREADS_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = (await tokenResponse.json()) as ThreadsTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange error:', tokenData);
      throw new functions.https.HttpsError('internal', 'Failed to exchange authorization code');
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${THREADS_APP_SECRET}&access_token=${shortLivedToken}`;

    const longLivedResponse = await fetch(longLivedUrl, { method: 'GET' });
    const longLivedData = (await longLivedResponse.json()) as ThreadsTokenResponse;

    if (!longLivedResponse.ok || !longLivedData.access_token) {
      console.error('Long-lived token error:', longLivedData);
      // Fall back to short-lived token if exchange fails
    }

    const accessToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 3600; // Default 1 hour if short-lived

    // Step 3: Get user profile info
    const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`;
    const profileResponse = await fetch(profileUrl);
    const profileData = (await profileResponse.json()) as ThreadsUserProfileResponse;

    if (!profileResponse.ok || !profileData.username) {
      console.error('Profile fetch error:', profileData);
      throw new functions.https.HttpsError('internal', 'Failed to fetch user profile');
    }

    console.log('Profile data:', JSON.stringify(profileData));
    console.log('Using Threads User ID from profile:', profileData.id);

    // Step 4: Encrypt access token before storing
    const encryptedAccessToken = await encrypt(accessToken);

    // Step 5: Store account in Firestore
    const userId = context.auth.uid;
    const accountRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(); // Auto-generate ID

    await accountRef.set({
      username: profileData.username,
      displayName: profileData.username,
      avatarUrl: profileData.threads_profile_picture_url || null,
      postingMethod: 'official', // Mark as official API
      threadsUserId: profileData.id,
      threadsAccessToken: encryptedAccessToken,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + expiresIn * 1000)
      ),
      isActive: true,
      // Analytics baseline
      baselineFollowersCount: 0,
      baselineFollowingCount: 0,
      baselinePostsCount: 0,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      accountId: accountRef.id,
      username: profileData.username,
    };
  } catch (error: any) {
    console.error('Error in exchangeThreadsToken:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to connect account');
  }
});
