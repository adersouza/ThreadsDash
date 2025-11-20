import { useState, useEffect, useMemo } from 'react';
import { useAccountStore } from '@/store/accountStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FollowerGrowthChart } from '@/components/analytics/FollowerGrowthChart';
import { TopPostsTable } from '@/components/analytics/TopPostsTable';
import { OptimalTimes } from '@/components/analytics/OptimalTimes';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import { Download, RefreshCw, TrendingUp, TrendingDown, Users, Activity, Calendar } from 'lucide-react';
import {
  generateMockDailyAnalytics,
  generateMockTopPosts,
  generateMockOptimalTimes,
  generateMockAnalyticsSummary,
} from '@/utils/mockAnalyticsData';
import { generateInsights, exportAnalyticsToCSV } from '@/services/analyticsService';
import type { AnalyticsTimeframe } from '@/types/analytics';

export const Analytics = () => {
  const { accounts } = useAccountStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30d');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Get number of days for timeframe
  const days = useMemo(() => {
    switch (timeframe) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 30;
    }
  }, [timeframe]);

  // Generate mock data for selected account
  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);
  const analyticsData = useMemo(
    () =>
      selectedAccountId && selectedAccount
        ? generateMockDailyAnalytics(
            selectedAccountId,
            days,
            selectedAccount.baselineFollowersCount || selectedAccount.followersCount || 0
          )
        : [],
    [selectedAccountId, selectedAccount, days]
  );

  const topPosts = useMemo(
    () =>
      selectedAccountId ? generateMockTopPosts(selectedAccountId, 10) : [],
    [selectedAccountId]
  );

  const optimalTimes = useMemo(() => generateMockOptimalTimes(), []);

  const insights = useMemo(
    () => generateInsights(analyticsData),
    [analyticsData]
  );

  const summary = useMemo(() => {
    if (!selectedAccount) return null;
    return generateMockAnalyticsSummary(
      selectedAccount.id,
      selectedAccount.username,
      days,
      selectedAccount.baselineFollowersCount || selectedAccount.followersCount || 0
    );
  }, [selectedAccount, days]);

  // Get chart data from analytics
  const chartData = useMemo(
    () =>
      analyticsData.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        followers: d.followersCount,
        gained: d.followersGained,
        lost: d.followersLost,
      })),
    [analyticsData]
  );

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastSync(new Date());
    setLoading(false);
  };

  const handleExport = () => {
    if (analyticsData.length === 0) return;

    const csv = exportAnalyticsToCSV(analyticsData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedAccount?.username}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Accounts Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect an account to view analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your performance and optimize your strategy
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!analyticsData.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                @{account.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as AnalyticsTimeframe)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground self-center">
          Last synced: {lastSync.toLocaleTimeString()}
        </p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follower Growth</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.followers.growthRate > 0 ? '+' : ''}
                {summary.followers.growthRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.followers.gained.toLocaleString()} gained,{' '}
                {summary.followers.lost.toLocaleString()} lost
              </p>
              <div className="mt-2">
                {summary.followers.growthRate > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.engagement.avgEngagementRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all posts
              </p>
              <div className="mt-2">
                {summary.engagement.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : summary.engagement.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <div className="h-4 w-4" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Day</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.bestDay}</div>
              <p className="text-xs text-muted-foreground">
                Highest engagement on this day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.posts.total}</div>
              <p className="text-xs text-muted-foreground">
                {summary.posts.avgPerDay.toFixed(1)} per day average
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <FollowerGrowthChart data={chartData} />
        </div>

        <OptimalTimes timeSlots={optimalTimes} />
        <InsightsPanel insights={insights} />

        <div className="lg:col-span-2">
          <TopPostsTable posts={topPosts} />
        </div>
      </div>
    </div>
  );
};
