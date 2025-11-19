# ThreadsDash

A comprehensive dashboard for managing and scheduling Threads posts with analytics.

## Features

✅ **Dashboard** - Real-time overview of accounts and post performance
✅ **Post Scheduling** - Calendar and list view with scheduling
✅ **Post Composer** - Rich editor with media upload and settings
✅ **Analytics** - Follower growth, engagement metrics, optimal posting times
✅ **Dual Posting Methods**:
- Browser automation via AdsPower (safest)
- Unofficial Instagram/Threads API (fastest)

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

## Rate Limiting

To protect accounts:
- Max 3 posts/hour
- Max 20 posts/day
- Min 15 minutes between posts

## License

MIT
