import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  DailyAnalytics,
  OptimalTimeSlot,
  AnalyticsInsight,
  AccountGrowth,
  TopPost,
  GrowthDataPoint,
} from '@/types/analytics';
import type { Post } from '@/types/post';

/**
 * Get analytics data for an account within a date range
 */
export async function getAccountAnalytics(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyAnalytics[]> {
  try {
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
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const analytics: DailyAnalytics[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      analytics.push({
        id: doc.id,
        accountId: data.accountId,
        date: data.date.toDate(),
        followersCount: data.followersCount || 0,
        followersGained: data.followersGained || 0,
        followersLost: data.followersLost || 0,
        postsCount: data.postsCount || 0,
        totalViews: data.totalViews || 0,
        totalLikes: data.totalLikes || 0,
        totalReplies: data.totalReplies || 0,
        totalReposts: data.totalReposts || 0,
        engagementRate: data.engagementRate || 0,
        averageEngagementRate: data.averageEngagementRate || 0,
        topPostId: data.topPostId,
      });
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching account analytics:', error);
    return [];
  }
}

/**
 * Calculate optimal posting times based on historical engagement data
 * Pure math, no AI - analyzes last 30 days of posts
 */
export async function calculateOptimalTimes(
  userId: string,
  accountId: string
): Promise<OptimalTimeSlot[]> {
  try {
    // Get posts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
      where('publishedAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('publishedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const timeSlots: Record<
      string,
      { total: number; count: number; posts: number }
    > = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.publishedAt || !data.performance) return;

      const publishedAt = data.publishedAt.toDate();
      const hour = publishedAt.getHours();
      const dayOfWeek = publishedAt.getDay();
      const key = `${dayOfWeek}-${hour}`;

      const engagement =
        data.performance.engagementRate ||
        (data.performance.likes + data.performance.replies + data.performance.reposts) /
          Math.max(data.performance.views, 1);

      if (!timeSlots[key]) {
        timeSlots[key] = { total: 0, count: 0, posts: 0 };
      }

      timeSlots[key].total += engagement;
      timeSlots[key].count += 1;
      timeSlots[key].posts += 1;
    });

    // Calculate scores and sort
    const optimalTimes: OptimalTimeSlot[] = Object.entries(timeSlots)
      .map(([key, data]) => {
        const [day, hour] = key.split('-').map(Number);
        const avgEngagement = data.total / data.count;

        // Score based on avg engagement and number of posts (more data = more reliable)
        const score = avgEngagement * Math.log(data.posts + 1);

        return {
          hour,
          dayOfWeek: day,
          score,
          avgEngagement,
          postCount: data.posts,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return optimalTimes;
  } catch (error) {
    console.error('Error calculating optimal times:', error);
    return [];
  }
}

/**
 * Generate insights based on analytics data
 * Pure logic-based insights, no AI
 */
export function generateInsights(analytics: DailyAnalytics[]): AnalyticsInsight[] {
  if (analytics.length === 0) return [];

  const insights: AnalyticsInsight[] = [];
  const sorted = [...analytics].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Follower growth insight
  const firstDay = sorted[0];
  const lastDay = sorted[sorted.length - 1];
  const totalGrowth = lastDay.followersCount - firstDay.followersCount;
  const growthRate = (totalGrowth / firstDay.followersCount) * 100;

  if (totalGrowth > 0) {
    insights.push({
      type: 'growth',
      title: 'Follower Growth',
      description: `Your followers grew by ${Math.abs(growthRate).toFixed(1)}% in this period`,
      value: growthRate,
      trend: 'up',
    });
  } else if (totalGrowth < 0) {
    insights.push({
      type: 'growth',
      title: 'Follower Decline',
      description: `Your followers decreased by ${Math.abs(growthRate).toFixed(1)}% in this period`,
      value: growthRate,
      trend: 'down',
    });
  }

  // Engagement trend
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, d) => sum + d.engagementRate, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, d) => sum + d.engagementRate, 0) / secondHalf.length;

  const engagementChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  if (Math.abs(engagementChange) > 10) {
    insights.push({
      type: 'engagement',
      title: engagementChange > 0 ? 'Engagement Improving' : 'Engagement Declining',
      description: `Your engagement rate ${engagementChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(engagementChange).toFixed(1)}% recently`,
      value: engagementChange,
      trend: engagementChange > 0 ? 'up' : 'down',
    });
  }

  // Best day to post
  const dayEngagement: Record<number, { total: number; count: number }> = {};
  sorted.forEach((day) => {
    const dayOfWeek = day.date.getDay();
    if (!dayEngagement[dayOfWeek]) {
      dayEngagement[dayOfWeek] = { total: 0, count: 0 };
    }
    dayEngagement[dayOfWeek].total += day.engagementRate;
    dayEngagement[dayOfWeek].count += 1;
  });

  const dayAverages = Object.entries(dayEngagement).map(([day, data]) => ({
    day: parseInt(day),
    avg: data.total / data.count,
  }));

  const bestDay = dayAverages.sort((a, b) => b.avg - a.avg)[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (bestDay) {
    const overallAvg = sorted.reduce((sum, d) => sum + d.engagementRate, 0) / sorted.length;
    const improvement = ((bestDay.avg - overallAvg) / overallAvg) * 100;

    insights.push({
      type: 'bestTime',
      title: 'Best Day to Post',
      description: `Posts on ${dayNames[bestDay.day]} get ${improvement.toFixed(0)}% more engagement`,
      value: improvement,
    });
  }

  // Posting consistency
  const avgPostsPerDay = sorted.reduce((sum, d) => sum + d.postsCount, 0) / sorted.length;
  if (avgPostsPerDay < 1) {
    insights.push({
      type: 'general',
      title: 'Post More Consistently',
      description: `You're averaging ${avgPostsPerDay.toFixed(1)} posts per day. Consistent posting can improve engagement.`,
    });
  }

  return insights;
}

/**
 * Get top performing posts
 */
export async function getTopPosts(
  userId: string,
  accountId: string,
  limitCount: number = 10
): Promise<TopPost[]> {
  try {
    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
      orderBy('performance.engagementRate', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    const topPosts: TopPost[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.performance) return;

      topPosts.push({
        postId: doc.id,
        accountId: data.accountId,
        content: data.content || '',
        publishedAt: data.publishedAt?.toDate() || new Date(),
        views: data.performance.views || 0,
        likes: data.performance.likes || 0,
        replies: data.performance.replies || 0,
        reposts: data.performance.reposts || 0,
        engagementRate: data.performance.engagementRate || 0,
        mediaCount: data.media?.length || 0,
        topics: data.topics || [],
      });
    });

    return topPosts;
  } catch (error) {
    console.error('Error fetching top posts:', error);
    return [];
  }
}

/**
 * Calculate account growth over time
 */
export async function getAccountGrowth(
  userId: string,
  accountId: string,
  days: number = 30
): Promise<AccountGrowth> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await getAccountAnalytics(userId, accountId, startDate, endDate);

    if (analytics.length === 0) {
      return {
        accountId,
        startDate,
        endDate,
        totalGained: 0,
        totalLost: 0,
        netGrowth: 0,
        growthRate: 0,
        chartData: [],
      };
    }

    const sorted = analytics.sort((a, b) => a.date.getTime() - b.date.getTime());
    const totalGained = sorted.reduce((sum, d) => sum + d.followersGained, 0);
    const totalLost = sorted.reduce((sum, d) => sum + d.followersLost, 0);
    const netGrowth = totalGained - totalLost;

    const startFollowers = sorted[0].followersCount - sorted[0].followersGained + sorted[0].followersLost;
    const growthRate = startFollowers > 0 ? (netGrowth / startFollowers) * 100 : 0;

    const chartData: GrowthDataPoint[] = sorted.map((d) => ({
      date: d.date.toISOString().split('T')[0],
      followers: d.followersCount,
      gained: d.followersGained,
      lost: d.followersLost,
    }));

    return {
      accountId,
      startDate,
      endDate,
      totalGained,
      totalLost,
      netGrowth,
      growthRate,
      chartData,
    };
  } catch (error) {
    console.error('Error calculating account growth:', error);
    return {
      accountId,
      startDate: new Date(),
      endDate: new Date(),
      totalGained: 0,
      totalLost: 0,
      netGrowth: 0,
      growthRate: 0,
      chartData: [],
    };
  }
}

/**
 * Export analytics data to CSV format
 */
export function exportAnalyticsToCSV(analytics: DailyAnalytics[]): string {
  if (analytics.length === 0) return '';

  const headers = [
    'Date',
    'Followers',
    'Gained',
    'Lost',
    'Posts',
    'Views',
    'Likes',
    'Replies',
    'Reposts',
    'Engagement Rate',
  ];

  const rows = analytics.map((d) => [
    d.date.toISOString().split('T')[0],
    d.followersCount.toString(),
    d.followersGained.toString(),
    d.followersLost.toString(),
    d.postsCount.toString(),
    d.totalViews.toString(),
    d.totalLikes.toString(),
    d.totalReplies.toString(),
    d.totalReposts.toString(),
    (d.engagementRate * 100).toFixed(2) + '%',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
