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
    // Import the posting function from threadsApi
    const { postToThreadsApi } = await import('./posting/threadsApi');
    
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

    // Validate API method credentials
    if (selectedMethod === 'api') {
      if (!account.instagramToken || !account.instagramUserId) {
        await postRef.update({
          status: 'failed',
          error: 'Instagram credentials not configured. Please add your Instagram token in account settings.',
        });
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Instagram credentials not configured. Please add your Instagram token in account settings.'
        );
      }
    }

    // Post to Threads via API
    const result = await postToThreadsApi(
      account.instagramToken,
      account.instagramUserId,
      post as any,
      accountDoc.id
    );

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
