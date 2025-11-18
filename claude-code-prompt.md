# PROMPT FOR CLAUDE CODE: Build Threads Dashboard

## Project Goal
Build a production-ready Threads account management dashboard similar to Buffer, optimized for OnlyFans managers. The platform should handle multiple accounts, maximize post reach, provide deep analytics, and automate workflows.

---

## Initial Setup Instructions

### Step 1: Initialize Project
```bash
# Create React + TypeScript + Vite project
npm create vite@latest threads-dashboard -- --template react-ts
cd threads-dashboard
npm install

# Install core dependencies
npm install firebase react-router-dom zustand
npm install @tanstack/react-query date-fns zod

# Install UI dependencies
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms @tailwindcss/typography
npx tailwindcss init -p

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog toast select calendar

# Install additional UI libraries
npm install react-big-calendar react-hook-form @hookform/resolvers
npm install recharts lucide-react
npm install react-dropzone react-image-crop

# Install Firebase Functions dependencies (in functions/ folder later)
npm install firebase-admin firebase-functions
npm install @anthropic-ai/sdk axios
```

### Step 2: Configure Tailwind
```javascript
// tailwind.config.js
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### Step 3: Set Up Firebase
```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login
firebase init

# Select:
# - Firestore
# - Functions (TypeScript)
# - Hosting
# - Storage

# Initialize functions
cd functions
npm install
```

---

## Implementation Order

Build the application in this order to ensure dependencies are met:

### PHASE 1: Foundation (Do this first)

#### 1.1 Firebase Configuration
Create `src/config/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

#### 1.2 TypeScript Types
Create `src/types/` folder with these files:

**account.ts:**
```typescript
export interface ThreadsAccount {
  id: string;
  userId: string;
  username: string;
  threadsUserId: string;
  accessToken: string;
  refreshToken: string;
  status: 'active' | 'banned' | 'limited' | 'warning';
  followers: number;
  following: number;
  postsCount: number;
  engagementRate: number;
  lastSyncAt: Date;
  proxyConfig?: ProxyConfig;
  adsPowerProfileId?: string;
  avatar: string;
  bio: string;
  createdAt: Date;
}

export interface ProxyConfig {
  type: 'isp' | 'residential' | 'datacenter';
  url: string;
  username?: string;
  password?: string;
}
```

**post.ts:**
```typescript
export interface Post {
  id: string;
  accountId: string;
  content: string;
  media: MediaItem[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: Date;
  publishedAt?: Date;
  threadId?: string;
  url?: string;
  topics: string[];
  settings: PostSettings;
  performance?: PostPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
}

export interface PostSettings {
  allowReplies: boolean;
  whoCanReply: 'everyone' | 'followers' | 'mentioned';
  topics: string[];
}

export interface PostPerformance {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  engagementRate: number;
}
```

**analytics.ts:**
```typescript
export interface DailyAnalytics {
  date: string;
  accountId: string;
  followers: number;
  followersGain: number;
  posts: number;
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  engagementRate: number;
  averageEngagement: number;
}

export interface OptimalTime {
  hour: number;
  dayOfWeek: number;
  score: number;
  avgEngagement: number;
}
```

#### 1.3 Authentication System
Create `src/components/auth/`:

**AuthProvider.tsx:**
```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '@/config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**LoginPage.tsx** and **SignupPage.tsx** - standard forms with email/password

#### 1.4 Routing Setup
Create `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PostCalendar from './pages/PostCalendar';
import Analytics from './pages/Analytics';
import MediaLibrary from './pages/MediaLibrary';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<PostCalendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

### PHASE 2: Core Dashboard (Build after Phase 1)

#### 2.1 Dashboard Layout
Create `src/layouts/DashboardLayout.tsx`:
```typescript
// Sidebar with navigation
// Header with account selector and user menu
// Main content area with Outlet for nested routes
// Use shadcn/ui components for sidebar and navigation
```

Include navigation items:
- Dashboard (home icon)
- Calendar (calendar icon)
- Posts (file-text icon)
- Analytics (bar-chart icon)
- Media (image icon)
- Settings (settings icon)

#### 2.2 Account State Management
Create `src/store/accountStore.ts` using Zustand:
```typescript
import { create } from 'zustand';
import { ThreadsAccount } from '@/types/account';

interface AccountStore {
  accounts: ThreadsAccount[];
  selectedAccountId: string | null;
  loading: boolean;
  setAccounts: (accounts: ThreadsAccount[]) => void;
  addAccount: (account: ThreadsAccount) => void;
  selectAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<ThreadsAccount>) => void;
}

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  selectedAccountId: null,
  loading: false,
  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((state) => ({ 
    accounts: [...state.accounts, account] 
  })),
  selectAccount: (id) => set({ selectedAccountId: id }),
  updateAccount: (id, updates) => set((state) => ({
    accounts: state.accounts.map(acc => 
      acc.id === id ? { ...acc, ...updates } : acc
    )
  })),
}));
```

#### 2.3 Firestore Hooks
Create `src/hooks/useAccounts.ts`:
```typescript
import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAccountStore } from '@/store/accountStore';
import { ThreadsAccount } from '@/types/account';

export function useAccounts() {
  const { user } = useAuth();
  const { setAccounts } = useAccountStore();

  useEffect(() => {
    if (!user) return;

    const accountsRef = collection(db, 'users', user.uid, 'threadsAccounts');
    const q = query(accountsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accounts: ThreadsAccount[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastSyncAt: doc.data().lastSyncAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as ThreadsAccount[];
      
      setAccounts(accounts);
    });

    return unsubscribe;
  }, [user, setAccounts]);
}
```

#### 2.4 Dashboard Page
Create `src/pages/Dashboard.tsx`:
```typescript
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountStore } from '@/store/accountStore';
import AccountCard from '@/components/dashboard/AccountCard';
import StatsOverview from '@/components/dashboard/StatsOverview';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  useAccounts(); // Initialize real-time listener
  const { accounts } = useAccountStore();

  const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followers, 0);
  const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
  const avgEngagement = accounts.reduce((sum, acc) => sum + acc.engagementRate, 0) / accounts.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <StatsOverview
        totalAccounts={accounts.length}
        activeAccounts={activeAccounts}
        totalFollowers={totalFollowers}
        avgEngagement={avgEngagement}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
```

#### 2.5 Account Card Component
Create `src/components/dashboard/AccountCard.tsx`:
```typescript
import { ThreadsAccount } from '@/types/account';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp } from 'lucide-react';

interface AccountCardProps {
  account: ThreadsAccount;
}

export default function AccountCard({ account }: AccountCardProps) {
  const statusColors = {
    active: 'bg-green-500',
    banned: 'bg-red-500',
    limited: 'bg-yellow-500',
    warning: 'bg-orange-500',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={account.avatar} 
            alt={account.username}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="font-semibold">@{account.username}</h3>
            <Badge className={statusColors[account.status]}>
              {account.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Followers
            </span>
            <span className="font-semibold">
              {account.followers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              Engagement
            </span>
            <span className="font-semibold">
              {(account.engagementRate * 100).toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(account.engagementRate * 100 * 2, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### PHASE 3: Post Scheduling (Build after Phase 2)

#### 3.1 Post Store
Create `src/store/postStore.ts`:
```typescript
import { create } from 'zustand';
import { Post } from '@/types/post';

interface PostStore {
  posts: Post[];
  selectedPost: Post | null;
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  selectPost: (post: Post | null) => void;
}

export const usePostStore = create<PostStore>((set) => ({
  posts: [],
  selectedPost: null,
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [...state.posts, post] })),
  updatePost: (id, updates) => set((state) => ({
    posts: state.posts.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  deletePost: (id) => set((state) => ({
    posts: state.posts.filter(p => p.id !== id)
  })),
  selectPost: (post) => set({ selectedPost: post }),
}));
```

#### 3.2 Post Composer Component
Create `src/components/posts/PostComposer.tsx`:
```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAccountStore } from '@/store/accountStore';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/components/auth/AuthProvider';

const postSchema = z.object({
  content: z.string().min(1).max(500),
  accountId: z.string(),
  scheduledFor: z.date().optional(),
  topics: z.array(z.string()).optional(),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostComposerProps {
  open: boolean;
  onClose: () => void;
}

export default function PostComposer({ open, onClose }: PostComposerProps) {
  const { user } = useAuth();
  const { accounts } = useAccountStore();
  const [isScheduling, setIsScheduling] = useState(false);
  
  const { register, handleSubmit, watch, setValue } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  });

  const content = watch('content', '');
  const charCount = content.length;

  const onSubmit = async (data: PostFormData) => {
    if (!user) return;

    const postsRef = collection(db, 'users', user.uid, 'posts');
    
    await addDoc(postsRef, {
      ...data,
      status: data.scheduledFor ? 'scheduled' : 'draft',
      media: [],
      settings: {
        allowReplies: true,
        whoCanReply: 'everyone',
        topics: data.topics || [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select onValueChange={(value) => setValue('accountId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  @{account.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Textarea
              {...register('content')}
              placeholder="What's on your mind?"
              className="min-h-[150px] resize-none"
              maxLength={500}
            />
            <div className="absolute bottom-2 right-2 text-sm text-gray-500">
              {charCount}/500
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsScheduling(!isScheduling)}>
              {isScheduling ? 'Cancel Schedule' : 'Schedule'}
            </Button>
            
            {isScheduling && (
              <Calendar
                mode="single"
                selected={watch('scheduledFor')}
                onSelect={(date) => setValue('scheduledFor', date)}
              />
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isScheduling ? 'Schedule Post' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3.3 Calendar View
Create `src/pages/PostCalendar.tsx`:
```typescript
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { usePosts } from '@/hooks/usePosts';
import { usePostStore } from '@/store/postStore';

const localizer = momentLocalizer(moment);

export default function PostCalendar() {
  usePosts(); // Initialize real-time listener
  const { posts } = usePostStore();

  const events = posts
    .filter(post => post.scheduledFor)
    .map(post => ({
      id: post.id,
      title: post.content.substring(0, 50) + '...',
      start: new Date(post.scheduledFor!),
      end: new Date(post.scheduledFor!),
      resource: post,
    }));

  return (
    <div className="h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Post Calendar</h1>
      <div className="h-[calc(100vh-200px)] bg-white rounded-lg p-4">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={(event) => {
            // Open post editor
            console.log('Selected post:', event.resource);
          }}
        />
      </div>
    </div>
  );
}
```

---

### PHASE 4: AI Features (Build after Phase 3)

#### 4.1 AI Service
Create `src/services/aiService.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
});

export async function enhanceCaption(
  originalCaption: string,
  context: {
    accountNiche?: string;
    targetAudience?: string;
    goal?: 'engagement' | 'reach' | 'conversions';
  }
): Promise<{
  enhanced: string;
  alternatives: string[];
  reasoning: string;
}> {
  const prompt = `You are a social media expert specializing in Threads content optimization.

Original caption: "${originalCaption}"
${context.accountNiche ? `Account niche: ${context.accountNiche}` : ''}
${context.targetAudience ? `Target audience: ${context.targetAudience}` : ''}
${context.goal ? `Goal: ${context.goal}` : ''}

Enhance this caption to maximize engagement. Consider:
- Hook in first line (first 10 words are crucial)
- Emotional triggers
- Call-to-action
- Optimal length (100-300 characters)
- Question or statement format
- Strategic emoji placement (1-3 max)

Respond in JSON format:
{
  "enhanced": "enhanced caption here",
  "alternatives": ["alt1", "alt2", "alt3"],
  "reasoning": "explanation of changes"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
  
  return JSON.parse(responseText);
}

export async function suggestTopics(
  content: string,
  accountData?: any
): Promise<{
  topics: Array<{ name: string; relevance: number; trending: boolean }>;
  reasoning: string;
}> {
  const prompt = `Analyze this Threads post content and suggest 5-10 relevant topics/hashtags:

Content: "${content}"

Consider:
- Content theme
- Current trending topics on Threads
- SEO-friendly topics
- Engagement potential

Respond in JSON format:
{
  "topics": [
    {"name": "topic1", "relevance": 0.95, "trending": true},
    {"name": "topic2", "relevance": 0.87, "trending": false}
  ],
  "reasoning": "explanation"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
  
  return JSON.parse(responseText);
}

export async function generateContentIdeas(
  accountNiche: string,
  recentPosts?: string[]
): Promise<{
  ideas: Array<{ title: string; description: string; category: string }>;
}> {
  const prompt = `Generate 10 engaging content ideas for a Threads account in the ${accountNiche} niche.

${recentPosts ? `Recent posts for context:\n${recentPosts.join('\n')}` : ''}

Provide diverse content types:
- Questions
- Tips/how-tos
- Controversial takes
- Stories/anecdotes
- Polls/discussions
- Behind-the-scenes
- Trending topic reactions

Respond in JSON format:
{
  "ideas": [
    {
      "title": "Short catchy title",
      "description": "Full post idea with suggested structure",
      "category": "question|tip|story|poll|etc"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
  
  return JSON.parse(responseText);
}
```

#### 4.2 Add AI Enhancement to Post Composer
Update `PostComposer.tsx` to include:
```typescript
import { enhanceCaption, suggestTopics } from '@/services/aiService';

// Add button:
<Button 
  type="button" 
  variant="outline"
  onClick={async () => {
    const result = await enhanceCaption(content, {
      goal: 'engagement'
    });
    setValue('content', result.enhanced);
  }}
>
  ✨ Enhance with AI
</Button>

// Add topics suggestion:
<Button
  type="button"
  variant="outline"
  onClick={async () => {
    const result = await suggestTopics(content);
    setValue('topics', result.topics.slice(0, 5).map(t => t.name));
  }}
>
  🏷️ Suggest Topics
</Button>
```

---

### PHASE 5: Analytics (Build after Phase 4)

#### 5.1 Analytics Service
Create `src/services/analyticsService.ts`:
```typescript
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DailyAnalytics, OptimalTime } from '@/types/analytics';

export async function getAccountAnalytics(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyAnalytics[]> {
  const analyticsRef = collection(
    db, 
    'users', 
    userId, 
    'threadsAccounts', 
    accountId, 
    'analytics'
  );
  
  const q = query(
    analyticsRef,
    where('date', '>=', startDate.toISOString().split('T')[0]),
    where('date', '<=', endDate.toISOString().split('T')[0]),
    orderBy('date', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as DailyAnalytics);
}

export async function calculateOptimalTimes(
  userId: string,
  accountId: string
): Promise<OptimalTime[]> {
  // Get last 30 days of posts with performance data
  const postsRef = collection(db, 'users', userId, 'posts');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const q = query(
    postsRef,
    where('accountId', '==', accountId),
    where('publishedAt', '>=', thirtyDaysAgo),
    where('status', '==', 'published')
  );

  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => doc.data());

  // Group by hour and day of week
  const timeSlots: { [key: string]: { engagements: number[]; count: number } } = {};

  posts.forEach(post => {
    const date = new Date(post.publishedAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const key = `${dayOfWeek}-${hour}`;

    if (!timeSlots[key]) {
      timeSlots[key] = { engagements: [], count: 0 };
    }

    const engagement = post.performance?.engagementRate || 0;
    timeSlots[key].engagements.push(engagement);
    timeSlots[key].count++;
  });

  // Calculate average engagement per slot
  const optimalTimes: OptimalTime[] = Object.entries(timeSlots)
    .map(([key, data]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      const avgEngagement = data.engagements.reduce((a, b) => a + b, 0) / data.count;
      
      return {
        hour,
        dayOfWeek,
        score: avgEngagement * 100,
        avgEngagement,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return optimalTimes;
}

export function generateInsights(analytics: DailyAnalytics[]): {
  followerGrowth: number;
  engagementTrend: 'up' | 'down' | 'stable';
  bestDay: string;
  recommendations: string[];
} {
  if (analytics.length < 2) {
    return {
      followerGrowth: 0,
      engagementTrend: 'stable',
      bestDay: 'Monday',
      recommendations: ['Need more data to generate insights'],
    };
  }

  const first = analytics[0];
  const last = analytics[analytics.length - 1];
  const followerGrowth = ((last.followers - first.followers) / first.followers) * 100;

  const avgEngagementFirst = analytics.slice(0, 3).reduce((sum, a) => sum + a.engagementRate, 0) / 3;
  const avgEngagementLast = analytics.slice(-3).reduce((sum, a) => sum + a.engagementRate, 0) / 3;
  
  let engagementTrend: 'up' | 'down' | 'stable' = 'stable';
  if (avgEngagementLast > avgEngagementFirst * 1.1) engagementTrend = 'up';
  if (avgEngagementLast < avgEngagementFirst * 0.9) engagementTrend = 'down';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDayData = analytics.reduce((best, current) => 
    current.engagementRate > best.engagementRate ? current : best
  );
  const bestDay = dayNames[new Date(bestDayData.date).getDay()];

  const recommendations: string[] = [];
  if (followerGrowth < 0) recommendations.push('Focus on engagement to recover followers');
  if (engagementTrend === 'down') recommendations.push('Try different content formats');
  recommendations.push(`Post more on ${bestDay}s when engagement is highest`);

  return { followerGrowth, engagementTrend, bestDay, recommendations };
}
```

#### 5.2 Analytics Dashboard Page
Create `src/pages/Analytics.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAccountStore } from '@/store/accountStore';
import { getAccountAnalytics, calculateOptimalTimes, generateInsights } from '@/services/analyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Analytics() {
  const { user } = useAuth();
  const { accounts, selectedAccountId, selectAccount } = useAccountStore();
  const [analytics, setAnalytics] = useState([]);
  const [optimalTimes, setOptimalTimes] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (!user || !selectedAccountId) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    Promise.all([
      getAccountAnalytics(user.uid, selectedAccountId, startDate, endDate),
      calculateOptimalTimes(user.uid, selectedAccountId),
    ]).then(([analyticsData, timesData]) => {
      setAnalytics(analyticsData);
      setOptimalTimes(timesData);
      setInsights(generateInsights(analyticsData));
    });
  }, [user, selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Select value={selectedAccountId || ''} onValueChange={selectAccount}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                @{account.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Follower Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {insights?.followerGrowth > 0 ? '+' : ''}
              {insights?.followerGrowth.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold capitalize">
              {insights?.engagementTrend}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {insights?.bestDay}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.length > 0
                ? (analytics.reduce((sum, a) => sum + a.engagementRate, 0) / analytics.length * 100).toFixed(2)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follower Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Follower Growth (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="followers" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Optimal Times */}
      <Card>
        <CardHeader>
          <CardTitle>Best Times to Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {optimalTimes.slice(0, 5).map((time, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][time.dayOfWeek]} at {time.hour}:00
                </span>
                <span className="font-semibold">
                  {(time.avgEngagement * 100).toFixed(2)}% engagement
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights?.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### PHASE 6: Cloud Functions (Build after Phase 5)

#### 6.1 Initialize Functions
```bash
cd functions
npm install firebase-admin firebase-functions @anthropic-ai/sdk axios
```

#### 6.2 Scheduled Post Processor
Create `functions/src/scheduledPosts.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase/admin';
import { publishToThreads } from './threadsApi';

export const processScheduledPosts = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Query all scheduled posts due now
    const postsSnapshot = await db.collectionGroup('posts')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', now)
      .limit(50)
      .get();

    const publishPromises = postsSnapshot.docs.map(async (doc) => {
      const post = doc.data();
      const postRef = doc.ref;

      try {
        // Get account credentials
        const accountDoc = await db
          .doc(`users/${post.userId}/threadsAccounts/${post.accountId}`)
          .get();
        
        const account = accountDoc.data();

        // Publish to Threads
        const result = await publishToThreads(account, post);

        // Update post status
        await postRef.update({
          status: 'published',
          publishedAt: now,
          threadId: result.id,
          url: result.url,
        });

        console.log(`Published post ${doc.id} to Threads`);
      } catch (error) {
        console.error(`Failed to publish post ${doc.id}:`, error);
        
        await postRef.update({
          status: 'failed',
          error: error.message,
        });
      }
    });

    await Promise.all(publishPromises);
  });
```

#### 6.3 Threads API Service
Create `functions/src/threadsApi.ts`:
```typescript
import axios from 'axios';

interface ThreadsAccount {
  accessToken: string;
  proxyConfig?: {
    url: string;
    username?: string;
    password?: string;
  };
}

interface Post {
  content: string;
  media: Array<{ type: string; url: string }>;
  settings: {
    allowReplies: boolean;
    topics: string[];
  };
}

export async function publishToThreads(
  account: ThreadsAccount,
  post: Post
): Promise<{ id: string; url: string }> {
  // This is a placeholder - implement actual Threads API calls
  // Based on reverse-engineered Instagram API or official Meta API
  
  const config: any = {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  // Add proxy if configured
  if (account.proxyConfig) {
    config.proxy = {
      host: new URL(account.proxyConfig.url).hostname,
      port: new URL(account.proxyConfig.url).port,
      auth: account.proxyConfig.username ? {
        username: account.proxyConfig.username,
        password: account.proxyConfig.password,
      } : undefined,
    };
  }

  // Example API call structure (adjust based on actual API)
  const response = await axios.post(
    'https://graph.threads.net/v1.0/me/threads',
    {
      text: post.content,
      media_type: post.media.length > 0 ? 'IMAGE' : 'TEXT',
      image_url: post.media[0]?.url,
      reply_control: post.settings.allowReplies ? 'everyone' : 'followers',
    },
    config
  );

  return {
    id: response.data.id,
    url: `https://threads.net/@username/post/${response.data.id}`,
  };
}

export async function fetchAccountData(accessToken: string): Promise<any> {
  const response = await axios.get(
    'https://graph.threads.net/v1.0/me',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        fields: 'id,username,name,threads_profile_picture_url,threads_biography',
      },
    }
  );

  return response.data;
}

export async function fetchPostPerformance(
  accessToken: string,
  postId: string
): Promise<any> {
  const response = await axios.get(
    `https://graph.threads.net/v1.0/${postId}/insights`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        metric: 'views,likes,replies,reposts,quotes',
      },
    }
  );

  return response.data;
}
```

#### 6.4 Analytics Sync Function
Create `functions/src/syncAnalytics.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { fetchAccountData, fetchPostPerformance } from './threadsApi';

export const syncAccountAnalytics = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Get all accounts
    const accountsSnapshot = await db.collectionGroup('threadsAccounts').get();

    const syncPromises = accountsSnapshot.docs.map(async (doc) => {
      const account = doc.data();
      const accountRef = doc.ref;

      try {
        // Fetch latest account data
        const accountData = await fetchAccountData(account.accessToken);

        // Update account stats
        await accountRef.update({
          followers: accountData.followers_count,
          following: accountData.following_count,
          postsCount: accountData.media_count,
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Fetch recent posts performance
        const postsSnapshot = await db
          .collection(`users/${account.userId}/posts`)
          .where('accountId', '==', doc.id)
          .where('status', '==', 'published')
          .orderBy('publishedAt', 'desc')
          .limit(100)
          .get();

        const performancePromises = postsSnapshot.docs.map(async (postDoc) => {
          const post = postDoc.data();
          
          if (!post.threadId) return;

          const performance = await fetchPostPerformance(
            account.accessToken,
            post.threadId
          );

          await postDoc.ref.update({
            'performance.views': performance.views,
            'performance.likes': performance.likes,
            'performance.replies': performance.replies,
            'performance.reposts': performance.reposts,
            'performance.quotes': performance.quotes,
            'performance.engagementRate': 
              (performance.likes + performance.replies + performance.reposts) / performance.views,
          });
        });

        await Promise.all(performancePromises);

        // Calculate daily analytics
        const today = new Date().toISOString().split('T')[0];
        const analyticsRef = accountRef.collection('analytics').doc(today);

        const todayPosts = postsSnapshot.docs.filter(doc => {
          const publishedAt = doc.data().publishedAt?.toDate();
          return publishedAt && publishedAt.toISOString().split('T')[0] === today;
        });

        const totalViews = todayPosts.reduce((sum, doc) => 
          sum + (doc.data().performance?.views || 0), 0);
        const totalLikes = todayPosts.reduce((sum, doc) => 
          sum + (doc.data().performance?.likes || 0), 0);
        const totalReplies = todayPosts.reduce((sum, doc) => 
          sum + (doc.data().performance?.replies || 0), 0);

        await analyticsRef.set({
          date: today,
          accountId: doc.id,
          followers: accountData.followers_count,
          followersGain: 0, // Calculate from previous day
          posts: todayPosts.length,
          totalViews,
          totalLikes,
          totalReplies,
          totalReposts: todayPosts.reduce((sum, doc) => 
            sum + (doc.data().performance?.reposts || 0), 0),
          engagementRate: totalViews > 0 ? (totalLikes + totalReplies) / totalViews : 0,
        }, { merge: true });

        console.log(`Synced analytics for account ${doc.id}`);
      } catch (error) {
        console.error(`Failed to sync account ${doc.id}:`, error);
      }
    });

    await Promise.all(syncPromises);
  });
```

#### 6.5 Account Health Monitor
Create `functions/src/healthMonitor.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const monitorAccountHealth = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();

    const accountsSnapshot = await db.collectionGroup('threadsAccounts').get();

    const checkPromises = accountsSnapshot.docs.map(async (doc) => {
      const account = doc.data();
      const accountRef = doc.ref;

      try {
        // Get recent analytics
        const analyticsSnapshot = await accountRef
          .collection('analytics')
          .orderBy('date', 'desc')
          .limit(7)
          .get();

        if (analyticsSnapshot.empty) return;

        const analytics = analyticsSnapshot.docs.map(d => d.data());
        const latest = analytics[0];
        const previousWeek = analytics[analytics.length - 1];

        // Check for issues
        const issues: Array<{ type: string; severity: string; message: string }> = [];

        // Follower loss check
        if (previousWeek && latest.followers < previousWeek.followers * 0.9) {
          issues.push({
            type: 'follower_loss',
            severity: 'warning',
            message: `Lost ${((1 - latest.followers / previousWeek.followers) * 100).toFixed(1)}% followers in the last week`,
          });
        }

        // Engagement drop check
        const avgEngagementRecent = analytics.slice(0, 3)
          .reduce((sum, a) => sum + a.engagementRate, 0) / 3;
        const avgEngagementOld = analytics.slice(-3)
          .reduce((sum, a) => sum + a.engagementRate, 0) / 3;

        if (avgEngagementRecent < avgEngagementOld * 0.5) {
          issues.push({
            type: 'engagement_drop',
            severity: 'critical',
            message: 'Engagement rate dropped by more than 50%',
          });
        }

        // Determine overall status
        let newStatus = 'active';
        if (issues.some(i => i.severity === 'critical')) {
          newStatus = 'limited';
        } else if (issues.length > 0) {
          newStatus = 'warning';
        }

        // Update if status changed
        if (newStatus !== account.status) {
          await accountRef.update({
            status: newStatus,
            lastHealthCheck: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Send notification
          // TODO: Implement notification service
          console.log(`Account ${doc.id} status changed to ${newStatus}`);
        }
      } catch (error) {
        console.error(`Health check failed for account ${doc.id}:`, error);
      }
    });

    await Promise.all(checkPromises);
  });
```

#### 6.6 Export Functions
Create `functions/src/index.ts`:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp();

export { processScheduledPosts } from './scheduledPosts';
export { syncAccountAnalytics } from './syncAnalytics';
export { monitorAccountHealth } from './healthMonitor';
```

---

### PHASE 7: Additional Features

#### 7.1 Media Library
Create `src/pages/MediaLibrary.tsx` with:
- File upload (drag & drop)
- Grid view with thumbnails
- Filters and search
- Tag editor
- Delete functionality

#### 7.2 Bulk Upload
Create CSV parser using `papaparse`:
```typescript
import Papa from 'papaparse';

function parseBulkPosts(file: File): Promise<Post[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const posts = results.data.map(row => ({
          accountId: row.account,
          content: row.content,
          scheduledFor: new Date(row.scheduledTime),
          topics: row.topics?.split(',') || [],
        }));
        resolve(posts);
      },
      error: reject,
    });
  });
}
```

#### 7.3 Content Ideas Generator
Create `src/pages/ContentIdeas.tsx`:
- Button to generate ideas using AI
- Display ideas in cards
- "Use this idea" button to open post composer
- Save/dismiss functionality

---

## Environment Setup

Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

Create `functions/.env`:
```env
ANTHROPIC_API_KEY=your_anthropic_key
THREADS_API_BASE_URL=https://graph.threads.net/v1.0
```

---

## Firestore Security Rules

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      match /threadsAccounts/{accountId} {
        allow read, write: if isOwner(userId);
        
        match /analytics/{document=**} {
          allow read: if isOwner(userId);
        }
      }
      
      match /posts/{postId} {
        allow read, write: if isOwner(userId);
      }
      
      match /mediaLibrary/{mediaId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

---

## Deployment Commands

```bash
# Build frontend
npm run build

# Deploy everything
firebase deploy

# Or deploy individually:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## Testing Checklist

Before considering the project complete, test:

1. ✅ User authentication (signup, login, logout)
2. ✅ Add Threads account
3. ✅ Create and schedule post
4. ✅ View calendar with scheduled posts
5. ✅ AI caption enhancement works
6. ✅ Analytics dashboard displays data
7. ✅ Optimal posting times calculated
8. ✅ Cloud Function deploys successfully
9. ✅ Scheduled post gets published
10. ✅ Account health monitoring works
11. ✅ Media upload and library
12. ✅ Mobile responsive design
13. ✅ Security rules protect data

---

## Next Steps After MVP

Once core functionality works:
1. Add A/B testing system
2. Implement auto-reply automation
3. Build team collaboration features
4. Add competitor tracking
5. Integrate AdsPower API
6. Create mobile PWA
7. Add export/reporting
8. Implement content recycling

---

## Important Notes

**API Limitations:**
- Threads doesn't have official API yet (as of Nov 2024)
- May need to reverse-engineer endpoints
- Use proxies to avoid rate limits
- Implement retry logic with exponential backoff

**Security:**
- Encrypt access tokens in Firestore
- Use Firebase Security Rules
- Implement rate limiting
- Validate all user inputs
- Use HTTPS only

**Performance:**
- Implement pagination for large lists
- Use Firestore indexes for complex queries
- Lazy load images
- Code split routes
- Cache frequently accessed data

**Costs:**
- Monitor Firebase usage
- Optimize Cloud Function execution time
- Use Firestore efficiently (minimize reads/writes)
- Compress images before upload
- Consider caching layer for AI requests

---

## Support Resources

- Firebase docs: https://firebase.google.com/docs
- React docs: https://react.dev
- Anthropic API: https://docs.anthropic.com
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com

---

## Completion Criteria

The project is complete when:
1. All core features from Phase 1-5 work
2. Cloud Functions deploy and run successfully
3. User can manage multiple accounts
4. Posts can be scheduled and published
5. Analytics display correctly
6. AI features enhance content
7. Application is responsive on mobile
8. Security rules protect user data
9. Application is deployed to Firebase Hosting
10. Basic documentation is written

Good luck! Build this iteratively, test often, and focus on getting core features working before adding advanced functionality.
