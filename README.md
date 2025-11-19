# ThreadsDash - Threads Account Management Dashboard

A modern, full-stack React application for managing multiple Threads accounts for OnlyFans managers.

## Phase 1 - Complete Setup

This Phase 1 implementation includes:

- React 18 + TypeScript + Vite
- Firebase Authentication (Email/Password + Google OAuth)
- Tailwind CSS with custom theme
- shadcn/ui component library
- Zustand state management
- React Router with protected routes
- Comprehensive TypeScript type definitions

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore (configured)
- **Storage**: Firebase Storage (configured)
- **State Management**: Zustand
- **Routing**: React Router v7
- **Charts**: Recharts (installed)
- **AI Integration**: Anthropic API (ready for future phases)

## Project Structure

```
ThreadsDash/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── AccountCard.tsx
│   │   │   └── StatsOverview.tsx
│   │   └── ui/             # shadcn/ui components
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── separator.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Firebase authentication context
│   ├── hooks/
│   │   └── useAccounts.ts  # Firestore real-time hooks
│   ├── layouts/
│   │   └── DashboardLayout.tsx # Main dashboard layout
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PostCalendar.tsx
│   │   ├── Analytics.tsx
│   │   ├── MediaLibrary.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   └── firebase.ts     # Firebase configuration
│   ├── store/
│   │   └── accountStore.ts # Zustand store
│   ├── types/
│   │   └── index.ts        # TypeScript definitions
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   ├── App.tsx             # Router configuration
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── components.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (for authentication and database)

### 1. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication methods:
   - Email/Password
   - Google OAuth
3. Create a Firestore database
4. Create a Storage bucket
5. Copy your Firebase configuration
6. Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

7. Add your Firebase credentials to `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Run the Development Server

The server is currently running at http://localhost:5173/

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## Features Implemented

### Phase 1: Foundation ✅

#### Authentication System
- Email/Password signup and login
- Google OAuth integration
- Password reset functionality
- Protected routes
- User session management
- Auth state persistence

#### State Management
- Zustand store for account management
- Local storage persistence
- Type-safe state updates
- Account, post, and analytics state ready

#### UI Components
- Modern, responsive design
- Dark mode support (configured)
- shadcn/ui component library
- Custom Tailwind theme
- Form validation
- Error handling

#### Type Definitions
Comprehensive TypeScript types for:
- User and Authentication
- Threads Accounts

### Phase 2: Core Dashboard UI ✅

#### Dashboard Layout
- Sidebar navigation with icons (Home, Calendar, Posts, Analytics, Media, Settings)
- Mobile responsive with collapsible sidebar
- Header with account selector dropdown
- User menu with profile and logout options
- Clean, modern design with purple theme

#### Real-time Data Integration
- Firestore hooks for real-time account syncing
- Automatic updates when accounts change
- Loading and error states
- Optimized listener cleanup

#### Account Management
- Beautiful account cards with hover effects
- Visual status badges (active, suspended, pending)
- Engagement rate progress bars
- Click to select account
- Follower count and engagement metrics

#### Stats Overview
- 4 stat cards: Total Accounts, Active Accounts, Total Followers, Avg Engagement
- Real-time calculations from account data
- Color-coded icons and visual indicators
- Responsive grid layout

#### Navigation Pages
- Home/Dashboard - Account overview and stats
- Calendar - Post scheduling (placeholder)
- Analytics - Performance tracking (placeholder)
- Media Library - Asset management (placeholder)
- Settings - User preferences (placeholder)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps (Future Phases)

### Phase 3 - Account Connection & Management
- [ ] Threads OAuth integration
- [ ] Add account flow with API connection
- [ ] Account management (edit, delete, refresh)
- [ ] Bulk account import
- [ ] Account health monitoring

### Phase 4 - Post Creation & Scheduling
- [ ] Post composer with media upload
- [ ] Schedule posts for future dates
- [ ] Media upload to Firebase Storage
- [ ] Post templates and drafts
- [ ] Bulk post scheduling

### Phase 5 - Analytics & Insights
- [ ] Dashboard with analytics charts
- [ ] Account performance metrics
- [ ] Post engagement tracking
- [ ] Export analytics reports
- [ ] Custom date range filters

### Phase 6 - AI Features
- [ ] AI-powered content generation (Anthropic)
- [ ] Content suggestions and optimization
- [ ] Hashtag recommendations
- [ ] Best time to post predictions
- [ ] Caption rewriting and tone adjustment

### Phase 7 - Advanced Features
- [ ] Team collaboration and permissions
- [ ] Custom workflows and automation
- [ ] Webhooks and API integrations
- [ ] Advanced reporting and exports
- [ ] White-label customization

## Environment Variables

See `.env.example` for all required environment variables.

## Firebase Security Rules

Before deploying to production, configure Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /accounts/{accountId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/accounts/$(accountId)).data.userId == request.auth.uid;
    }
    match /posts/{postId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Contributing

This is a private project for OnlyFans managers. Contact the project owner for contribution guidelines.

## License

Private and Proprietary

## Support

For issues or questions, please contact the development team.

---

Built with React, TypeScript, Firebase, and Tailwind CSS
