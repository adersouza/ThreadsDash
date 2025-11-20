/**
 * Instagram Authentication Cloud Function
 *
 * Handles Instagram login from the server-side to avoid CORS issues
 */

import * as functions from 'firebase-functions';
import { authenticator } from 'otplib';

interface InstagramLoginResponse {
  logged_in_user?: {
    pk: string;
    username: string;
    full_name: string;
  };
  two_factor_required?: boolean;
  two_factor_info?: {
    username: string;
    two_factor_identifier: string;
  };
  status?: string;
  message?: string;
}

/**
 * Generate a device ID for Instagram API
 */
function generateDeviceId(): string {
  return 'android-' + Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Extract session token from cookies
 */
function extractSessionToken(cookies: string | null): string {
  if (!cookies) return '';

  const sessionMatch = cookies.match(/sessionid=([^;]+)/);
  return sessionMatch ? sessionMatch[1] : '';
}

/**
 * Login to Instagram and get account info
 */
export const instagramLogin = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { username, password, twoFactorSecret } = data;

  if (!username || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Username and password are required');
  }

  try {
    // Generate device UUID
    const deviceId = generateDeviceId();

    // Step 1: Initial login attempt
    const loginResponse = await fetch('https://i.instagram.com/api/v1/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
        'X-IG-App-ID': '567067343352427',
        'X-IG-Device-ID': deviceId,
      },
      body: new URLSearchParams({
        username,
        password,
        device_id: deviceId,
        login_attempt_count: '0',
      }).toString(),
    });

    const loginData: InstagramLoginResponse = await loginResponse.json();

    let sessionToken = '';
    let userId = '';

    // Check if login succeeded without 2FA
    if (loginData.logged_in_user) {
      const cookies = loginResponse.headers.get('set-cookie');
      sessionToken = extractSessionToken(cookies);
      userId = loginData.logged_in_user.pk;
    }
    // Handle 2FA if required
    else if (loginData.two_factor_required) {
      if (!twoFactorSecret) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          '2FA code required but no 2FA secret provided. Please add your 2FA secret when setting up the account.'
        );
      }

      // Generate TOTP code from secret
      const twoFactorCode = authenticator.generate(twoFactorSecret);

      // Submit 2FA code
      const twoFactorResponse = await fetch('https://i.instagram.com/api/v1/accounts/two_factor_login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
          'X-IG-App-ID': '567067343352427',
          'X-IG-Device-ID': deviceId,
        },
        body: new URLSearchParams({
          username,
          verification_code: twoFactorCode,
          two_factor_identifier: loginData.two_factor_info?.two_factor_identifier || '',
          device_id: deviceId,
          trust_this_device: '0',
        }).toString(),
      });

      const twoFactorData: InstagramLoginResponse = await twoFactorResponse.json();

      if (twoFactorData.logged_in_user) {
        const cookies = twoFactorResponse.headers.get('set-cookie');
        sessionToken = extractSessionToken(cookies);
        userId = twoFactorData.logged_in_user.pk;
      } else {
        throw new functions.https.HttpsError(
          'unauthenticated',
          twoFactorData.message || '2FA verification failed'
        );
      }
    } else {
      throw new functions.https.HttpsError(
        'unauthenticated',
        loginData.message || 'Login failed'
      );
    }

    // Step 2: Fetch account info
    const accountInfoResponse = await fetch(`https://i.instagram.com/api/v1/users/${userId}/info/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer IGT:2:${sessionToken}`,
        'User-Agent': 'Barcelona 289.0.0.77.109 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 489705618)',
        'X-IG-App-ID': '567067343352427',
      },
    });

    const accountInfoData = await accountInfoResponse.json();

    let followers = 0;
    let following = 0;
    let posts = 0;

    if (accountInfoData.status === 'ok' && accountInfoData.user) {
      followers = accountInfoData.user.follower_count || 0;
      following = accountInfoData.user.following_count || 0;
      posts = accountInfoData.user.media_count || 0;
    }

    // Return success with token, userId, and account stats
    return {
      success: true,
      token: sessionToken,
      userId: userId,
      followers,
      following,
      posts,
    };

  } catch (error: any) {
    console.error('Instagram login error:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to authenticate with Instagram'
    );
  }
});
