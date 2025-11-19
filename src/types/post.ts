// Post-related types for ThreadsDash

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  size: number;
  uploadedAt: Date;
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
  engagementRate: number;
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface Post {
  id: string;
  userId: string; // Owner of the post
  accountId: string; // Which account to post from
  content: string;
  media: MediaItem[];
  status: PostStatus;
  scheduledFor?: Date;
  publishedAt?: Date;
  topics: string[];
  settings: PostSettings;
  performance?: PostPerformance;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string; // For failed posts
}

export interface CreatePostData {
  accountId: string;
  content: string;
  media?: MediaItem[];
  scheduledFor?: Date;
  topics?: string[];
  settings?: Partial<PostSettings>;
}

export interface UpdatePostData {
  content?: string;
  media?: MediaItem[];
  scheduledFor?: Date;
  topics?: string[];
  settings?: Partial<PostSettings>;
  status?: PostStatus;
}

// Form validation schema interfaces
export interface PostFormData {
  accountId: string;
  accountIds: string[]; // For bulk posting
  content: string;
  mediaFiles: File[];
  topics: string[];
  scheduledFor?: Date;
  allowReplies: boolean;
  whoCanReply: 'everyone' | 'followers' | 'mentioned';
  saveAsDraft: boolean;
}

// Calendar event type for react-big-calendar
export interface CalendarPost {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Post;
}

// Filter and sort types
export interface PostFilter {
  status?: PostStatus[];
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

export type PostSortField = 'createdAt' | 'scheduledFor' | 'publishedAt' | 'content';
export type SortDirection = 'asc' | 'desc';

export interface PostSort {
  field: PostSortField;
  direction: SortDirection;
}
