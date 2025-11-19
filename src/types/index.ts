// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

// Threads Account Types
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
  accessToken?: string; // Encrypted access token for Threads API
  refreshToken?: string; // Encrypted refresh token

  // Posting Method Configuration
  postingMethod: 'browser' | 'api'; // Choose between browser automation or API
  instagramToken?: string; // Encrypted Instagram token for unofficial API method
  instagramUserId?: string; // Instagram user ID
  adsPowerProfileId?: string; // AdsPower profile ID for browser automation
  lastPostAt?: Date; // Last time a post was published (for rate limiting)

  // Rate Limiting Tracking
  postsLastHour?: number; // Number of posts in the last hour
  postsToday?: number; // Number of posts today
  rateLimitResetAt?: Date; // When rate limits reset
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

export interface AdsPowerProfile {
  id: string;
  name: string;
  browserType: string;
  status: 'active' | 'inactive';
}
