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
│   │   ├── auth/           # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layout/         # Layout components (ready for expansion)
│   │   └── ui/             # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── label.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Firebase authentication context
│   ├── hooks/              # Custom hooks (ready for expansion)
│   ├── pages/
│   │   ├── Login.tsx       # Login page with email/Google auth
│   │   ├── Signup.tsx      # Signup page
│   │   └── Dashboard.tsx   # Main dashboard (starter)
│   ├── services/
│   │   └── firebase.ts     # Firebase configuration
│   ├── store/
│   │   └── accountStore.ts # Zustand store for account management
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles with Tailwind
├── .env.example            # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── components.json         # shadcn/ui configuration
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

## Features Implemented (Phase 1)

### Authentication System
- Email/Password signup and login
- Google OAuth integration
- Password reset functionality
- Protected routes
- User session management
- Auth state persistence

### State Management
- Zustand store for account management
- Local storage persistence
- Type-safe state updates
- Account, post, and analytics state ready

### UI Components
- Modern, responsive design
- Dark mode support (configured)
- shadcn/ui component library
- Custom Tailwind theme
- Form validation
- Error handling

### Type Definitions
Comprehensive TypeScript types for:
- User and Authentication
- Threads Accounts
- Posts
- Analytics
- Dashboard Stats
- API Responses
- Forms and Filters

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps (Future Phases)

### Phase 2 - Core Functionality
- [ ] Threads account connection flow
- [ ] Account management (add, edit, delete)
- [ ] Post creation and scheduling
- [ ] Media upload to Firebase Storage
- [ ] Real-time sync with Threads API

### Phase 3 - Analytics & Insights
- [ ] Dashboard with analytics charts
- [ ] Account performance metrics
- [ ] Post engagement tracking
- [ ] Export analytics reports
- [ ] Custom date range filters

### Phase 4 - AI Features
- [ ] AI-powered content generation (Anthropic)
- [ ] Content suggestions
- [ ] Hashtag recommendations
- [ ] Best time to post predictions
- [ ] Engagement optimization

### Phase 5 - Advanced Features
- [ ] Bulk post scheduling
- [ ] Content calendar
- [ ] Team collaboration
- [ ] Multi-account management
- [ ] Custom notifications

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
