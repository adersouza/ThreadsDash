/**
 * Delete Threads Post Cloud Function
 * Deletes a post from Threads and updates Firestore
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { decrypt } from './encryption';

// Lazy initialization to avoid timeout during deployment
function getDb() {
  return admin.firestore();
}

/**
 * Delete a post from Threads using the official API
 */
export const deleteThreadsPost = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { postId } = data;

  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'postId is required');
  }

  try {
    // Get the post document
    const postRef = getDb().collection('users').doc(userId).collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found');
    }

    const postData = postDoc.data();

    // Verify post belongs to user
    if (postData?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to delete this post');
    }

    // Check if post is published
    if (postData?.status !== 'published') {
      throw new functions.https.HttpsError('failed-precondition', 'Only published posts can be deleted from Threads');
    }

    // Get threadId from post or look it up in activity log
    let threadId = postData?.threadId;

    if (!threadId) {
      console.log(`Post ${postId} doesn't have threadId, looking up in activity log...`);

      // Try to find threadId in activity log
      const activityQuery = await getDb()
        .collection('users')
        .doc(userId)
        .collection('activity')
        .where('type', '==', 'post_published')
        .where('postId', '==', postId)
        .limit(1)
        .get();

      if (!activityQuery.empty) {
        const activityData = activityQuery.docs[0].data();
        threadId = activityData.threadId;
        console.log(`Found threadId in activity log: ${threadId}`);
      }

      if (!threadId) {
        throw new functions.https.HttpsError('failed-precondition', 'Could not find Threads ID for this post');
      }
    }

    // Get account credentials
    const accountRef = getDb().collection('users').doc(userId).collection('accounts').doc(postData.accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const accountData = accountDoc.data();

    if (!accountData?.threadsAccessToken) {
      throw new functions.https.HttpsError('failed-precondition', 'Account does not have OAuth credentials');
    }

    // Decrypt access token
    const accessToken = await decrypt(accountData.threadsAccessToken);

    console.log(`Deleting Threads post ${threadId} for user ${userId}`);

    // Delete from Threads using official API
    const deleteUrl = `https://graph.threads.net/v1.0/${threadId}?access_token=${accessToken}`;
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
    });

    const deleteData = await deleteResponse.json();

    if (!deleteResponse.ok) {
      console.error('Threads delete error:', deleteData);
      throw new functions.https.HttpsError('internal', deleteData.error?.message || 'Failed to delete post from Threads');
    }

    console.log('Delete response from Threads:', deleteData);

    // Update post status in Firestore to 'deleted'
    await postRef.update({
      status: 'deleted',
      threadId: threadId, // Store threadId if it wasn't already there
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log activity
    await getDb().collection('users').doc(userId).collection('activity').add({
      type: 'post_deleted',
      postId: postId,
      threadId: threadId,
      accountId: postData.accountId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Post ${postId} deleted successfully`);

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  } catch (error: any) {
    console.error('Error in deleteThreadsPost:', error);

    // If it's already a HttpsError, rethrow it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw new functions.https.HttpsError('internal', error.message || 'Failed to delete post');
  }
});
