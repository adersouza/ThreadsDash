# ThreadsDash Setup Guide

## Quick Start Checklist

### 1. Firebase Setup (Required to test authentication)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project" or select existing project
3. Follow the setup wizard

#### Enable Authentication:
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (optional but recommended)

#### Create Firestore Database:
1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **test mode** for development
4. Choose your location

#### Create Storage Bucket:
1. Go to **Storage**
2. Click "Get started"
3. Use default security rules for now

#### Get Your Firebase Config:
1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the web icon (</>) to add a web app
4. Copy the configuration values

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123
```

### 3. Test the Application

```bash
# Start the development server
npm run dev
```

Visit: http://localhost:5173

### 4. Test Authentication Flow

1. Click "Sign up" to create a new account
2. Enter your details and create an account
3. You should be redirected to the dashboard
4. Try logging out and logging back in
5. Try "Continue with Google" if you enabled Google auth

## Troubleshooting

### Issue: Firebase errors on login/signup

**Solution**: Make sure you've:
- Created a `.env` file with your Firebase credentials
- Enabled Email/Password authentication in Firebase Console
- Restarted the dev server after adding `.env` file

### Issue: "Firebase not configured" warning

**Solution**: The app will work without Firebase, but authentication won't function until you add your Firebase credentials.

### Issue: TypeScript errors

**Solution**: Run `npm install` to ensure all dependencies are installed.

### Issue: Tailwind styles not loading

**Solution**: Make sure `src/index.css` contains the Tailwind directives and is imported in `src/main.tsx`.

## Development Workflow

1. **Make changes** to your code
2. **Vite will hot-reload** automatically
3. **Check the browser console** for any errors
4. **Use React DevTools** for debugging

## Project Structure Overview

```
src/
├── components/      # Reusable UI components
│   ├── auth/       # Auth-related components
│   ├── layout/     # Layout components (future)
│   └── ui/         # shadcn/ui components
├── contexts/       # React contexts (Auth)
├── hooks/          # Custom React hooks (future)
├── pages/          # Page components
├── services/       # External services (Firebase)
├── store/          # Zustand stores
├── types/          # TypeScript type definitions
└── lib/            # Utility functions
```

## Code Style

- Use **TypeScript** for all files
- Follow **functional components** with hooks
- Use **Tailwind CSS** for styling
- Keep components **small and focused**
- Add **proper error handling**
- Include **TypeScript types** for everything

## Git Best Practices

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add user profile page"

# Push to remote
git push
```

### Commit Message Conventions:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `style:` - Styling changes
- `docs:` - Documentation
- `test:` - Testing

## Ready for Phase 2?

Once you've confirmed:
- Authentication works (signup, login, logout)
- Dashboard loads correctly
- No console errors
- Firebase is properly configured

You're ready to move on to implementing core features like:
- Threads account management
- Post creation and scheduling
- Analytics dashboard
- And more!

## Need Help?

Check these resources:
- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)

---

Happy coding!
