# ThreadsDash

A comprehensive dashboard for managing and scheduling Threads posts with analytics.

## Features

✅ **Dashboard** - Real-time overview of accounts and post performance
✅ **Post Scheduling** - Calendar and list view with scheduling
✅ **Post Composer** - Rich editor with media upload and settings
✅ **Analytics** - Follower growth, engagement metrics, optimal posting times
✅ **Multiple Posting Methods**:
- **Official Threads API via OAuth** (recommended, most reliable)
- Unofficial Instagram/Threads API with cookies
- Browser automation via AdsPower (enterprise option)

## Tech Stack

- React 18 + TypeScript + Vite
- Firebase (Auth, Firestore, Storage, Functions)
- TailwindCSS + shadcn/ui
- Recharts, Zustand, Playwright

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication, Firestore, Storage, Functions
3. Add config to `src/services/firebase.ts`
4. Deploy Cloud Functions:
   ```bash
   cd functions && npm install
   firebase deploy --only functions
   ```

## Threads OAuth Setup (Recommended)

To enable the official Threads API OAuth flow:

1. **Create Meta App**
   - Go to https://developers.facebook.com
   - Create a new app and add Threads API product
   - Note your App ID and Threads App ID

2. **Configure OAuth Settings**
   - Add redirect URI: `https://your-domain.web.app/auth/threads/callback`
   - Request permissions: `threads_basic`, `threads_content_publish`, `threads_manage_insights`

3. **Set Cloud Function Environment Variable**
   ```bash
   firebase functions:config:set threads.app_secret="YOUR_THREADS_APP_SECRET"
   firebase deploy --only functions
   ```

   Or set in `.env` for local development:
   ```bash
   THREADS_APP_SECRET=your_app_secret_here
   ```

4. **Update App Configuration** (if different from defaults)
   - Edit `functions/src/auth/threadsOAuth.ts`
   - Update `THREADS_APP_ID` and `REDIRECT_URI` if needed

5. **Connect Account**
   - Open your dashboard
   - Click "Add Account"
   - Select "OAuth (Recommended)" tab
   - Click "Connect with Threads"

## Rate Limiting

To protect accounts:
- Max 3 posts/hour
- Max 20 posts/day
- Min 15 minutes between posts

## License

MIT
