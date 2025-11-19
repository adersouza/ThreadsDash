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
