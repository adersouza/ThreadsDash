/**
 * Cloud Functions for ThreadsDash
 *
 * Main entry point for all Firebase Cloud Functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { processScheduledPosts, publishPostNow } from './scheduledPosts';
export { instagramLogin } from './instagramAuth';
export { publishPost } from './publishPost';

// OAuth functions for official Threads API
export { threadsOAuthCallback, refreshThreadsToken, autoRefreshTokens } from './threadsOAuth';
