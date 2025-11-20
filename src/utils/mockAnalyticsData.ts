import type {
  DailyAnalytics,
  TopPost,
  OptimalTimeSlot,
  AnalyticsSummary,
} from '@/types/analytics';

/**
 * Generate mock daily analytics data for testing
 * @param accountId - The account ID
 * @param days - Number of days to generate data for
 * @param baselineFollowers - Starting follower count (defaults to random if not provided)
 */
export function generateMockDailyAnalytics(
  accountId: string,
  days: number = 30,
  baselineFollowers?: number
): DailyAnalytics[] {
  const analytics: DailyAnalytics[] = [];
  const today = new Date();
  // Use baseline if provided, otherwise use random starting value
  let currentFollowers = baselineFollowers !== undefined
    ? baselineFollowers
    : 1000 + Math.floor(Math.random() * 5000);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const followersGained = Math.floor(Math.random() * 50) + 5;
    const followersLost = Math.floor(Math.random() * 20);
    currentFollowers += followersGained - followersLost;

    const postsCount = Math.floor(Math.random() * 5);
    const totalViews = postsCount * (Math.floor(Math.random() * 500) + 100);
    const totalLikes = Math.floor(totalViews * (0.05 + Math.random() * 0.1));
    const totalReplies = Math.floor(totalViews * (0.01 + Math.random() * 0.03));
    const totalReposts = Math.floor(totalViews * (0.005 + Math.random() * 0.02));

    const totalEngagement = totalLikes + totalReplies + totalReposts;
    const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;

    analytics.push({
      id: `analytics-${accountId}-${i}`,
      accountId,
      date,
      followersCount: currentFollowers,
      followersGained,
      followersLost,
      postsCount,
      totalViews,
      totalLikes,
      totalReplies,
      totalReposts,
      engagementRate,
      averageEngagementRate: engagementRate,
      topPostId: postsCount > 0 ? `post-${i}` : undefined,
    });
  }

  return analytics;
}

/**
 * Generate mock top posts for testing
 */
export function generateMockTopPosts(accountId: string, count: number = 10): TopPost[] {
  const posts: TopPost[] = [];
  const contentSamples = [
    'Just launched our new feature! Check it out 🚀',
    'Behind the scenes look at our process',
    'Quick tip: Did you know you can...',
    'Exciting announcement coming tomorrow!',
    'Thanks for 10K followers! Here\'s what\'s next',
    'Tutorial: How to get started in 5 minutes',
    'Weekend vibes ✨',
    'This changed everything for us',
    'Ask me anything in the comments',
    'New blog post is live!',
  ];

  for (let i = 0; i < count; i++) {
    const views = Math.floor(Math.random() * 10000) + 1000;
    const likes = Math.floor(views * (0.05 + Math.random() * 0.15));
    const replies = Math.floor(views * (0.01 + Math.random() * 0.05));
    const reposts = Math.floor(views * (0.005 + Math.random() * 0.03));
    const engagementRate = (likes + replies + reposts) / views;

    const daysAgo = Math.floor(Math.random() * 30);
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - daysAgo);

    posts.push({
      postId: `post-${i}`,
      accountId,
      content: contentSamples[i % contentSamples.length],
      publishedAt,
      views,
      likes,
      replies,
      reposts,
      engagementRate,
      mediaCount: Math.floor(Math.random() * 4),
      topics: ['tech', 'startup', 'tips'].slice(0, Math.floor(Math.random() * 3) + 1),
    });
  }

  return posts.sort((a, b) => b.engagementRate - a.engagementRate);
}

/**
 * Generate mock optimal time slots
 */
export function generateMockOptimalTimes(): OptimalTimeSlot[] {
  const optimalTimes: OptimalTimeSlot[] = [];

  // Generate some realistic optimal times
  const timeSlots = [
    { hour: 9, dayOfWeek: 1, baseScore: 0.15 }, // Monday 9 AM
    { hour: 12, dayOfWeek: 2, baseScore: 0.14 }, // Tuesday noon
    { hour: 15, dayOfWeek: 3, baseScore: 0.13 }, // Wednesday 3 PM
    { hour: 18, dayOfWeek: 4, baseScore: 0.12 }, // Thursday 6 PM
    { hour: 10, dayOfWeek: 5, baseScore: 0.11 }, // Friday 10 AM
    { hour: 20, dayOfWeek: 1, baseScore: 0.10 }, // Monday 8 PM
    { hour: 14, dayOfWeek: 2, baseScore: 0.09 }, // Tuesday 2 PM
    { hour: 11, dayOfWeek: 3, baseScore: 0.08 }, // Wednesday 11 AM
    { hour: 16, dayOfWeek: 4, baseScore: 0.07 }, // Thursday 4 PM
    { hour: 13, dayOfWeek: 5, baseScore: 0.06 }, // Friday 1 PM
  ];

  timeSlots.forEach((slot) => {
    const variance = (Math.random() - 0.5) * 0.02;
    const avgEngagement = slot.baseScore + variance;
    const postCount = Math.floor(Math.random() * 20) + 10;

    optimalTimes.push({
      hour: slot.hour,
      dayOfWeek: slot.dayOfWeek,
      score: avgEngagement * Math.log(postCount + 1),
      avgEngagement,
      postCount,
    });
  });

  return optimalTimes;
}

/**
 * Generate mock analytics summary
 */
export function generateMockAnalyticsSummary(
  accountId: string,
  accountName: string,
  days: number = 30,
  baselineFollowers?: number
): AnalyticsSummary {
  const analytics = generateMockDailyAnalytics(accountId, days, baselineFollowers);
  const firstDay = analytics[0];
  const lastDay = analytics[analytics.length - 1];

  const totalPosts = analytics.reduce((sum, d) => sum + d.postsCount, 0);
  const totalViews = analytics.reduce((sum, d) => sum + d.totalViews, 0);
  const totalLikes = analytics.reduce((sum, d) => sum + d.totalLikes, 0);
  const totalReplies = analytics.reduce((sum, d) => sum + d.totalReplies, 0);
  const totalReposts = analytics.reduce((sum, d) => sum + d.totalReposts, 0);

  const avgEngagementRate =
    analytics.reduce((sum, d) => sum + d.engagementRate, 0) / analytics.length;

  const midpoint = Math.floor(analytics.length / 2);
  const firstHalf = analytics.slice(0, midpoint);
  const secondHalf = analytics.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, d) => sum + d.engagementRate, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, d) => sum + d.engagementRate, 0) / secondHalf.length;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up';
  else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down';

  const dayEngagement: Record<number, { total: number; count: number }> = {};
  analytics.forEach((day) => {
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

  const bestDayNum = dayAverages.sort((a, b) => b.avg - a.avg)[0]?.day || 1;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const topPosts = generateMockTopPosts(accountId, 1);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    accountId,
    accountName,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    followers: {
      current: lastDay.followersCount,
      gained: analytics.reduce((sum, d) => sum + d.followersGained, 0),
      lost: analytics.reduce((sum, d) => sum + d.followersLost, 0),
      growthRate:
        ((lastDay.followersCount - firstDay.followersCount) / firstDay.followersCount) * 100,
    },
    posts: {
      total: totalPosts,
      published: totalPosts,
      avgPerDay: totalPosts / days,
    },
    engagement: {
      totalViews,
      totalLikes,
      totalReplies,
      totalReposts,
      avgEngagementRate,
      trend,
    },
    bestDay: dayNames[bestDayNum],
    bestTime: '9:00 AM',
    topPost: topPosts[0],
  };
}
