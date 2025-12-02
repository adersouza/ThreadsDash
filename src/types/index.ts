// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

// Model Types (for grouping accounts)
export interface Model {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string; // Hex color for visual identification
  createdAt: Date;
  updatedAt: Date;
}

// Threads Account Types (Client-Safe)
// Tokens are intentionally excluded from this interface
// They are stored in Firestore but never exposed to client-side code
export interface ThreadsAccount {
  id: string;
  userId: string; // Firebase user ID who owns this account
  username: string;
  displayName: string;
  bio: string;
  profilePictureUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  createdAt: Date;
  lastSyncedAt: Date;
  status: 'active' | 'inactive' | 'suspended' | 'pending';

  // OAuth Metadata (tokens stored server-side only)
  threadsUserId?: string; // Threads user ID
  tokenExpiresAt?: Date; // When the access token expires
  lastPostAt?: Date; // Last time a post was published (for rate limiting)

  // Instagram/Unofficial API metadata
  instagramUserId?: string; // Instagram user ID
  instagramToken?: string; // Encrypted Instagram session token (legacy)

  // Posting method
  postingMethod?: 'oauth' | 'unofficial'; // Preferred posting method

  // Rate Limiting Tracking
  postsLastHour?: number; // Number of posts in the last hour
  postsToday?: number; // Number of posts today
  rateLimitResetAt?: Date; // When rate limits reset

  // Analytics Baseline (captured when account is first added)
  baselineFollowersCount?: number; // Initial follower count when account was added
  baselineFollowingCount?: number; // Initial following count when account was added
  baselinePostsCount?: number; // Initial posts count when account was added

  // Model Association
  modelIds?: string[]; // Array of model IDs this account belongs to
}

// Server-Side Account Type (includes sensitive tokens)
// Used only in Cloud Functions - never exposed to client
export interface ThreadsAccountWithTokens extends ThreadsAccount {
  accessToken?: string; // Encrypted access token (legacy/unofficial API)
  refreshToken?: string; // Encrypted refresh token (legacy)
  threadsAccessToken?: string; // Encrypted Threads OAuth access token
}

// Post Types
export interface ThreadsPost {
  id: string;
  accountId: string; // Reference to ThreadsAccount
  text: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'carousel' | 'text';
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  quotesCount: number;
  viewsCount: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  permalink: string;
  isReply: boolean;
  replyToPostId?: string;
  status: 'published' | 'draft' | 'scheduled' | 'failed';
  scheduledFor?: Date;
  tags: string[];
}

// Analytics Types
export interface AccountAnalytics {
  id: string;
  accountId: string;
  date: Date;
  followersGained: number;
  followersLost: number;
  totalFollowers: number;
  totalPosts: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalViews: number;
  engagementRate: number; // Percentage
  averageLikesPerPost: number;
  averageRepliesPerPost: number;
  topPerformingPostId?: string;
}

export interface PostAnalytics {
  id: string;
  postId: string;
  date: Date;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  engagementRate: number;
  reachRate: number;
  clickThroughRate?: number;
}

// Engagement Metrics
export interface EngagementMetrics {
  totalEngagements: number;
  engagementRate: number;
  likesRate: number;
  repliesRate: number;
  repostsRate: number;
  avgEngagementPerPost: number;
}

// Time Series Data for Charts
export interface TimeSeriesDataPoint {
  date: string; // ISO date string
  value: number;
  label?: string;
}

export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

// Dashboard Types
export interface DashboardStats {
  totalAccounts: number;
  totalPosts: number;
  totalFollowers: number;
  totalEngagements: number;
  avgEngagementRate: number;
  topPerformingAccount?: ThreadsAccount;
  recentPosts: ThreadsPost[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Form Types
export interface CreatePostForm {
  accountId: string;
  text: string;
  mediaFiles?: File[];
  scheduledFor?: Date;
  tags: string[];
}

export interface EditAccountForm {
  displayName: string;
  bio: string;
  profilePicture?: File;
}

// Filter and Sort Types
export type PostSortBy = 'publishedAt' | 'likesCount' | 'repliesCount' | 'viewsCount' | 'engagementRate';
export type SortOrder = 'asc' | 'desc';

export interface PostFilters {
  accountId?: string;
  status?: ThreadsPost['status'];
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  tags?: string[];
  sortBy?: PostSortBy;
  sortOrder?: SortOrder;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// AI Content Generation Types (for future phases)
export interface AIContentRequest {
  prompt: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'humorous';
  maxLength?: number;
  includeHashtags?: boolean;
  targetAudience?: string;
}

export interface AIContentResponse {
  generatedText: string;
  suggestions: string[];
  hashtagSuggestions: string[];
}

// Posting Service Types
export interface PostingResult {
  success: boolean;
  threadId?: string; // The ID of the created thread
  error?: string;
  timestamp: Date;
}

export interface RateLimitInfo {
  canPost: boolean;
  reason?: string;
  nextAvailableTime?: Date;
  postsRemainingThisHour: number;
  postsRemainingToday: number;
}

// Media Library Types
export interface MediaFile {
  id: string;
  userId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  fileType: 'image' | 'video';
  storageUrl: string; // Firebase Storage URL
  thumbnailUrl?: string; // Thumbnail for videos
  width?: number;
  height?: number;
  duration?: number; // For videos, in seconds
  createdAt: Date;
  updatedAt: Date;
  usageCount: number; // How many times this media has been used
  lastUsedAt?: Date;
  tags: string[];
  description?: string;
}

// Queue System Types
export interface QueueSlot {
  id: string;
  userId: string;
  accountId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  timeSlot: string; // Format: "HH:mm" (e.g., "09:00")
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueuedPost {
  postId: string;
  accountId: string;
  queuePosition: number;
  scheduledFor?: Date; // Assigned time slot
  addedToQueueAt: Date;
}


