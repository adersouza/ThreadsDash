// Analytics-related types for ThreadsDash

export interface DailyAnalytics {
  id: string;
  accountId: string;
  date: Date;
  followersCount: number;
  followersGained: number;
  followersLost: number;
  postsCount: number;
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  engagementRate: number;
  averageEngagementRate: number;
  topPostId?: string;
}

export interface OptimalTimeSlot {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (0 = Sunday)
  score: number;
  avgEngagement: number;
  postCount: number;
}

export interface AnalyticsInsight {
  type: 'growth' | 'engagement' | 'bestTime' | 'postType' | 'general';
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}

export interface AccountGrowth {
  accountId: string;
  startDate: Date;
  endDate: Date;
  totalGained: number;
  totalLost: number;
  netGrowth: number;
  growthRate: number; // Percentage
  chartData: GrowthDataPoint[];
}

export interface GrowthDataPoint {
  date: string;
  followers: number;
  gained: number;
  lost: number;
}

export interface TopPost {
  postId: string;
  accountId: string;
  content: string;
  publishedAt: Date;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  engagementRate: number;
  mediaCount: number;
  topics: string[];
}

export interface EngagementByTime {
  hour: number;
  dayOfWeek: number;
  dayName: string;
  postCount: number;
  avgEngagement: number;
  totalEngagement: number;
}

export interface PostTypePerformance {
  type: 'text' | 'image' | 'video' | 'carousel';
  count: number;
  avgViews: number;
  avgLikes: number;
  avgReplies: number;
  avgReposts: number;
  avgEngagementRate: number;
}

export interface AnalyticsSummary {
  accountId: string;
  accountName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  followers: {
    current: number;
    gained: number;
    lost: number;
    growthRate: number;
  };
  posts: {
    total: number;
    published: number;
    avgPerDay: number;
  };
  engagement: {
    totalViews: number;
    totalLikes: number;
    totalReplies: number;
    totalReposts: number;
    avgEngagementRate: number;
    trend: 'up' | 'down' | 'stable';
  };
  bestDay: string;
  bestTime: string;
  topPost?: TopPost;
}

export interface ComparisonMetric {
  accountId: string;
  accountName: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface DateRange {
  label: string;
  start: Date;
  end: Date;
}

export type AnalyticsTimeframe = '7d' | '30d' | '90d' | 'custom';
