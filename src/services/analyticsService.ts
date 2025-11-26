import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  Timestamp,
  QueryConstraint,
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
      'accounts',
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
        totalViews: data.views || 0,
        totalLikes: data.likes || 0,
        totalReplies: data.replies || 0,
        totalReposts: data.reposts || 0,
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
 * Pure math, no AI - analyzes posts from specified timeframe
 */
export async function calculateOptimalTimes(
  userId: string,
  accountId: string,
  days: number = 90
): Promise<OptimalTimeSlot[]> {
  try {
    // Get posts from specified timeframe
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
      where('publishedAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('publishedAt', 'asc')
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

      // Only include posts that have some views (actual data)
      if (data.performance.views === 0) return;

      // Calculate engagement rate from raw metrics
      const totalEngagements =
        (data.performance.likes || 0) +
        (data.performance.replies || 0) +
        (data.performance.reposts || 0);
      const engagement = totalEngagements / data.performance.views;

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
      .filter(slot => slot.postCount > 0 && slot.avgEngagement > 0) // Only show times with actual engagement
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return optimalTimes;
  } catch (error) {
    console.error('Error calculating optimal times:', error);
    return [];
  }
}

/**
 * Analyze posts to find the best day to post
 */
export async function getBestDayFromPosts(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<{ day: number; improvement: number } | null> {
  try {
    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
      where('publishedAt', '>=', Timestamp.fromDate(startDate)),
      where('publishedAt', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);

    if (snapshot.size === 0) return null;

    const dayEngagement: Record<number, { total: number; count: number }> = {};
    let totalEngagement = 0;
    let totalCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.performance || !data.publishedAt) return;

      const publishedAt = data.publishedAt.toDate();
      const dayOfWeek = publishedAt.getDay();

      // Calculate engagement rate
      const views = data.performance.views || 0;
      if (views === 0) return;

      const engagements =
        (data.performance.likes || 0) +
        (data.performance.replies || 0) +
        (data.performance.reposts || 0);
      const engagementRate = engagements / views;

      if (!dayEngagement[dayOfWeek]) {
        dayEngagement[dayOfWeek] = { total: 0, count: 0 };
      }

      dayEngagement[dayOfWeek].total += engagementRate;
      dayEngagement[dayOfWeek].count += 1;
      totalEngagement += engagementRate;
      totalCount += 1;
    });

    if (totalCount === 0) return null;

    const overallAvg = totalEngagement / totalCount;

    // Find best day
    const dayAverages = Object.entries(dayEngagement)
      .map(([day, data]) => ({
        day: parseInt(day),
        avg: data.total / data.count,
      }))
      .filter(d => d.avg > 0);

    if (dayAverages.length === 0) return null;

    const bestDay = dayAverages.sort((a, b) => b.avg - a.avg)[0];
    const improvement = ((bestDay.avg - overallAvg) / overallAvg) * 100;

    return { day: bestDay.day, improvement };
  } catch (error) {
    console.error('Error finding best day from posts:', error);
    return null;
  }
}

/**
 * Generate insights based on analytics data
 * Pure logic-based insights, no AI
 */
export async function generateInsights(
  analytics: DailyAnalytics[],
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsInsight[]> {
  const insights: AnalyticsInsight[] = [];

  if (analytics.length === 0) {
    // Still try to generate best day insight from posts even without daily analytics
    const bestDay = await getBestDayFromPosts(userId, accountId, startDate, endDate);
    if (bestDay) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        type: 'bestTime',
        title: 'Best Day to Post',
        description: `Posts on ${dayNames[bestDay.day]} get ${bestDay.improvement.toFixed(0)}% more engagement`,
        value: bestDay.improvement,
      });
    }
    return insights;
  }

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

  // Best day to post - calculate from individual posts
  const bestDay = await getBestDayFromPosts(userId, accountId, startDate, endDate);
  if (bestDay) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push({
      type: 'bestTime',
      title: 'Best Day to Post',
      description: `Posts on ${dayNames[bestDay.day]} get ${bestDay.improvement.toFixed(0)}% more engagement`,
      value: bestDay.improvement,
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
  limitCount: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<TopPost[]> {
  try {
    const postsRef = collection(db, 'users', userId, 'posts');

    const constraints: QueryConstraint[] = [
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
    ];

    // Add date range filters if provided
    if (startDate) {
      constraints.push(where('publishedAt', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      constraints.push(where('publishedAt', '<=', Timestamp.fromDate(endDate)));
    }

    constraints.push(orderBy('publishedAt', 'desc'));
    constraints.push(firestoreLimit(limitCount * 3)); // Get more to sort by engagement

    const q = query(postsRef, ...constraints);

    const snapshot = await getDocs(q);
    const allPosts: TopPost[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.performance) return;

      allPosts.push({
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

    // Sort by engagement rate and return top posts
    const topPosts = allPosts
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, limitCount);

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
 * Get summary metrics from posts within a date range
 */
export async function getPostsSummary(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalEngagements: number;
  avgEngagementRate: number;
}> {
  try {
    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('accountId', '==', accountId),
      where('status', '==', 'published'),
      where('publishedAt', '>=', Timestamp.fromDate(startDate)),
      where('publishedAt', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);

    let totalViews = 0;
    let totalLikes = 0;
    let totalReplies = 0;
    let totalReposts = 0;
    let totalEngagementRate = 0;
    let postsWithMetrics = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.performance) return;

      totalViews += data.performance.views || 0;
      totalLikes += data.performance.likes || 0;
      totalReplies += data.performance.replies || 0;
      totalReposts += data.performance.reposts || 0;
      totalEngagementRate += data.performance.engagementRate || 0;
      postsWithMetrics++;
    });

    return {
      totalPosts: snapshot.size,
      totalViews,
      totalLikes,
      totalReplies,
      totalReposts,
      totalEngagements: totalLikes + totalReplies + totalReposts,
      avgEngagementRate: postsWithMetrics > 0 ? totalEngagementRate / postsWithMetrics : 0,
    };
  } catch (error) {
    console.error('Error getting posts summary:', error);
    return {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalReposts: 0,
      totalEngagements: 0,
      avgEngagementRate: 0,
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
