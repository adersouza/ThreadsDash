/**
 * Publish Post Cloud Function
 * Handles posting to Threads from server-side to avoid CORS
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Lazy initialization to avoid timeout during deployment
function getDb() {
  return admin.firestore();
}

export const publishPost = functions
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { postId } = data;
  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'postId is required');
  }

  const userId = context.auth.uid;

  try {
    // Import the posting function from threadsApi
    const { postToThreadsOfficialApi } = await import('./posting/threadsApi');

    // Get post document
    const postRef = getDb().collection('users').doc(userId).collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found');
    }

    const post = postDoc.data();

    // Get account document
    const accountRef = getDb().collection('users').doc(userId).collection('accounts').doc(post!.accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const account = accountDoc.data();
    if (!account) {
      throw new functions.https.HttpsError('not-found', 'Account data not found');
    }

    // Validate OAuth credentials
    if (!account.threadsAccessToken || !account.threadsUserId) {
      await postRef.update({
        status: 'failed',
        error: 'No OAuth credentials configured. Please reconnect your account using OAuth.',
      });
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No OAuth credentials configured. Please reconnect your account using OAuth.'
      );
    }

    // Post using official Threads API
    console.log('Using official Threads API for posting');
    const result = await postToThreadsOfficialApi(
      account.threadsAccessToken,
      account.threadsUserId,
      post as any,
      accountDoc.id,
      userId  // Pass userId for temp storage path
    );

    if (result.success) {
      // Update post status
      await postRef.update({
        status: 'published',
        threadId: result.threadId,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log activity
      await getDb().collection('users').doc(userId).collection('activity').add({
        type: 'post_published',
        postId: postId,
        accountId: post!.accountId,
        threadId: result.threadId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
