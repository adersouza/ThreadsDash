/**
 * Publish Post Cloud Function
 * Handles posting to Threads from server-side to avoid CORS
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const publishPost = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { postId, postingMethod } = data;
  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'postId is required');
  }

  const userId = context.auth.uid;
  const selectedMethod = postingMethod || 'api';

  try {
    // Import the posting functions from threadsApi
    const { postToThreadsApi, postToThreadsOfficialApi } = await import('./posting/threadsApi');

    // Get post document
    const postRef = db.collection('users').doc(userId).collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found');
    }

    const post = postDoc.data();

    // Get account document
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(post!.accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const account = accountDoc.data();
    if (!account) {
      throw new functions.https.HttpsError('not-found', 'Account data not found');
    }

    // Check posting method and validate
    if (selectedMethod === 'browser') {
      // Browser automation cannot run in Cloud Functions
      await postRef.update({
        status: 'failed',
        error: 'Browser automation requires a separate posting server. Cloud Functions cannot run headless browsers. Please use API method or set up a dedicated posting server with AdsPower.',
      });
      throw new functions.https.HttpsError(
        'unimplemented',
        'Browser automation requires a separate posting server. Cloud Functions cannot run headless browsers. Please use API method or set up a dedicated posting server with AdsPower.'
      );
    }

    // Determine which API method to use
    let result;

    if (account.postingMethod === 'official' && account.threadsAccessToken && account.threadsUserId) {
      // Use official Threads API
      console.log('Using official Threads API for posting');
      console.log('Account data:', {
        username: account.username,
        threadsUserId: account.threadsUserId,
        hasAccessToken: !!account.threadsAccessToken,
        postingMethod: account.postingMethod
      });
      console.log('Post data:', {
        content: post!.content,
        mediaCount: post!.media?.length || 0,
        topics: post!.topics
      });

      result = await postToThreadsOfficialApi(
        account.threadsAccessToken,
        account.threadsUserId,
        post as any,
        accountDoc.id
      );
    } else if (account.instagramToken && account.instagramUserId) {
      // Use unofficial API with cookie-based auth
      console.log('Using unofficial Threads API for posting');
      result = await postToThreadsApi(
        account.instagramToken,
        account.instagramUserId,
        account.csrfToken || '',
        account.igDid || '',
        account.mid || '',
        post as any,
        accountDoc.id
      );
    } else {
      // No valid credentials
      await postRef.update({
        status: 'failed',
        error: 'No valid credentials configured. Please reconnect your account.',
      });
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No valid credentials configured. Please reconnect your account.'
      );
    }

    if (result.success) {
      // Update post status
      await postRef.update({
        status: 'published',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Post published successfully' };
    } else {
      // Update post with error
      await postRef.update({
        status: 'failed',
        error: result.error,
      });

      throw new functions.https.HttpsError('internal', result.error || 'Failed to publish post');
    }
  } catch (error: any) {
    console.error('Error in publishPost:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'Failed to publish post');
  }
});
