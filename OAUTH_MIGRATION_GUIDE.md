# OAuth Migration Guide - Official Threads API

This guide will help you migrate ThreadsDash from the reverse-engineered cookie-based API to the official Threads API using OAuth.

## 📋 Overview

**What Changed:**
- ✅ **Official API**: Now using Meta's official Threads API (launched June 2024)
- ✅ **OAuth Authentication**: Secure OAuth 2.0 flow instead of manual cookie extraction
- ✅ **Auto Token Refresh**: Access tokens automatically refresh before the 60-day expiration
- ✅ **Backward Compatible**: Legacy cookie-based accounts continue to work (but are deprecated)

**Benefits:**
- More secure and reliable
- No more manual cookie extraction
- Compliant with Meta's Terms of Service
- Access to official analytics and insights
- Better rate limiting and error handling

---

## 🚀 Setup Steps

### 1. Create a Threads App in Meta Developer Portal

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select app type: **Business**
4. Fill in app details:
   - **App Name**: ThreadsDash (or your preferred name)
   - **Contact Email**: Your email
5. Click "Create App"

### 2. Configure Threads API

1. In your app dashboard, go to "Add Product"
2. Find **"Threads"** and click "Set Up"
3. Go to **Settings** → **Basic**:
   - Note your **App ID** (you'll need this)
   - Note your **App Secret** (keep this secret!)

### 3. Configure OAuth Redirect URIs

1. In Threads API settings, find **"OAuth Redirect URIs"**
2. Add your callback URLs:
   - **Local development**: `http://localhost:5173/oauth/callback`
   - **Production**: `https://your-domain.web.app/oauth/callback`
3. Click "Save Changes"

### 4. Configure Environment Variables

#### Frontend (.env file)

Create or update `.env` in the project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Edit `.env` and add:

```bash
# Threads API Configuration
VITE_THREADS_APP_ID=your_app_id_here
VITE_THREADS_REDIRECT_URI=http://localhost:5173/oauth/callback
# For production: https://your-domain.web.app/oauth/callback
```

#### Backend (Firebase Functions Config)

Configure the Threads app secret (NEVER commit this to git):

```bash
firebase functions:config:set threads.app_id="YOUR_APP_ID"
firebase functions:config:set threads.app_secret="YOUR_APP_SECRET"
```

Verify configuration:

```bash
firebase functions:config:get
```

### 5. Deploy Cloud Functions

```bash
# Build functions
cd functions
npm run build

# Deploy to Firebase
cd ..
firebase deploy --only functions
```

**New Cloud Functions deployed:**
- `threadsOAuthCallback` - Handles OAuth token exchange
- `refreshThreadsToken` - Manually refresh an access token
- `autoRefreshTokens` - Scheduled function to auto-refresh expiring tokens (runs daily)

### 6. Update Existing Cloud Functions

The following functions now support both OAuth and legacy authentication:
- `publishPost` - Auto-detects auth method
- `processScheduledPosts` - Auto-detects auth method

### 7. Test OAuth Flow

1. Start development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173

3. Go to Dashboard → Add Account

4. You'll see 3 tabs:
   - **OAuth (Recommended)** ← Use this!
   - Manual (Legacy)
   - Bulk Import

5. Click "Connect with Threads"

6. You'll be redirected to Threads to authorize the app

7. After authorization, you'll be redirected back with your account connected!

---

## 🔄 Migrating Existing Accounts

### Option 1: Add New OAuth Accounts (Recommended)

1. Go to Dashboard → Add Account
2. Click OAuth tab
3. Click "Connect with Threads"
4. After connecting, you can delete old cookie-based accounts

### Option 2: Keep Legacy Accounts (Temporary)

- Legacy cookie-based accounts will continue to work
- However, they're deprecated and may break if Meta changes their internal API
- **Recommendation**: Migrate to OAuth within 30 days

---

## 📊 Database Schema Changes

### New Account Fields (OAuth)

```typescript
{
  authMethod: 'oauth',  // Distinguishes OAuth from legacy 'cookies'
  accessToken: string,  // OAuth access token (encrypted in Firestore)
  threadsUserId: string,  // Threads user ID
  tokenExpiresAt: Timestamp,  // Token expiration (auto-refreshed)
  // ... other fields
}
```

### Legacy Account Fields (Deprecated)

```typescript
{
  authMethod: 'cookies',  // or undefined for old accounts
  instagramToken: string,  // sessionid cookie (base64 encoded)
  instagramUserId: string,  // ds_user_id
  csrfToken: string,  // csrftoken
  igDid: string,  // ig_did
  mid: string,  // mid
  // ... other fields
}
```

---

## 🔐 Security Notes

### What's Stored in Firestore

**OAuth accounts:**
- Access token (not encrypted - Firestore security rules protect it)
- Threads user ID
- Token expiration timestamp

**Legacy accounts:**
- Session cookies (base64 encoded)
- NOT recommended for production use

### Firebase Security Rules

Ensure your Firestore rules protect account data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/accounts/{accountId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🧪 Testing

### Test OAuth Flow

1. **Authorization**:
   ```
   https://threads.net/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=http://localhost:5173/oauth/callback&scope=threads_basic,threads_content_publish&response_type=code
   ```

2. **Token Exchange** (handled by Cloud Function):
   - Receives authorization code
   - Exchanges for short-lived token (1 hour)
   - Exchanges for long-lived token (60 days)
   - Stores in Firestore

3. **Token Refresh** (automatic):
   - Runs daily via `autoRefreshTokens` scheduled function
   - Refreshes tokens expiring within 7 days
   - Updates Firestore with new token and expiration

### Test Posting

1. Create a test post in the dashboard
2. Check Cloud Functions logs:
   ```bash
   firebase functions:log
   ```
3. Look for: "Using official Threads API (OAuth)"

---

## 🐛 Troubleshooting

### "Threads API credentials not configured"

**Fix:**
```bash
firebase functions:config:set threads.app_id="YOUR_APP_ID"
firebase functions:config:set threads.app_secret="YOUR_APP_SECRET"
firebase deploy --only functions
```

### "OAuth redirect URI mismatch"

**Fix:**
1. Go to Meta Developer Portal → Your App → Threads API → Settings
2. Add your callback URL: `http://localhost:5173/oauth/callback`
3. For production, add: `https://your-domain.web.app/oauth/callback`

### "Failed to exchange authorization code"

**Possible causes:**
- Incorrect App ID or App Secret
- OAuth redirect URI not configured in Meta Developer Portal
- Authorization code already used (codes expire after one use)

**Fix:**
- Double-check App ID and Secret in Firebase config
- Verify redirect URI in Meta Developer Portal
- Try the OAuth flow again (get a fresh code)

### Posting fails with "Failed to create media container"

**Possible causes:**
- Access token expired (shouldn't happen with auto-refresh)
- Missing required permissions
- Media URL inaccessible

**Fix:**
- Check token expiration in Firestore
- Manually refresh token: Call `refreshThreadsToken` Cloud Function
- Verify scopes: `threads_basic,threads_content_publish`

---

## 📚 Official Threads API Documentation

- [Threads API Overview](https://developers.facebook.com/docs/threads)
- [Get Started Guide](https://developers.facebook.com/docs/threads/get-started)
- [Publishing Posts](https://developers.facebook.com/docs/threads/posts)
- [Threads API Reference](https://developers.facebook.com/docs/threads/reference)
- [Meta Sample App](https://github.com/fbsamples/threads_api)

---

## 🎯 Next Steps

1. ✅ Complete setup steps above
2. ✅ Deploy Cloud Functions
3. ✅ Test OAuth flow with one account
4. ✅ Migrate all accounts to OAuth
5. ✅ Remove legacy cookie-based authentication (optional, after testing)

---

## 💡 Tips

- **Token Expiration**: Tokens last 60 days and auto-refresh 7 days before expiration
- **Rate Limits**: Official API has better rate limits than reverse-engineered API
- **Analytics**: Use `getThreadsProfile()` and `getThreadInsights()` functions for analytics
- **Revocation**: Users can revoke access anytime from Threads → Settings → Security

---

## 🤝 Support

If you encounter issues:

1. Check Firebase Functions logs: `firebase functions:log`
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Review [Threads API Changelog](https://developers.facebook.com/docs/threads/changelog) for updates

---

## 📝 Changelog

### 2025-11-21 - OAuth Migration

**Added:**
- Official Threads API integration with OAuth 2.0
- `threadsOAuthCallback` Cloud Function
- `refreshThreadsToken` Cloud Function
- `autoRefreshTokens` scheduled function
- `OAuthCallback` page component
- OAuth tab in AccountModal (now default)

**Changed:**
- `publishPost` now detects and routes to appropriate API
- `scheduledPosts` now detects and routes to appropriate API
- AccountModal UI redesigned with OAuth as recommended method

**Deprecated:**
- Manual cookie extraction (still supported for backward compatibility)
- Legacy `instagramToken`, `csrfToken`, `igDid`, `mid` fields

---

## 🎉 Congratulations!

You've successfully migrated to the official Threads API! Your dashboard is now more secure, reliable, and compliant with Meta's Terms of Service.

Happy posting! 🧵
