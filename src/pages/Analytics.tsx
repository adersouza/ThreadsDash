import { useState, useEffect, useMemo } from 'react';
import { useAccountStore } from '@/store/accountStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Download, RefreshCw, TrendingUp, TrendingDown, Users, Activity, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getAccountAnalytics,
  getTopPosts,
  calculateOptimalTimes,
  generateInsights,
  getAccountGrowth,
  exportAnalyticsToCSV,
  getPostsSummary,
} from '@/services/analyticsService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import type { AnalyticsTimeframe, DailyAnalytics, TopPost, OptimalTimeSlot, AccountGrowth } from '@/types/analytics';

export const Analytics = () => {
  const { currentUser } = useAuth();
  const { accounts } = useAccountStore();
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30d');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<DailyAnalytics[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeSlot[]>([]);
  const [growth, setGrowth] = useState<AccountGrowth | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [postsSummary, setPostsSummary] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalReplies: 0,
    totalReposts: 0,
    totalEngagements: 0,
    avgEngagementRate: 0,
  });

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

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

  // Load analytics data
  useEffect(() => {
    if (!currentUser || !selectedAccountId) return;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [analytics, posts, times, accountGrowth, summary] = await Promise.all([
          getAccountAnalytics(currentUser.uid, selectedAccountId, startDate, endDate),
          getTopPosts(currentUser.uid, selectedAccountId, 10, startDate, endDate),
          calculateOptimalTimes(currentUser.uid, selectedAccountId, days),
          getAccountGrowth(currentUser.uid, selectedAccountId, days),
          getPostsSummary(currentUser.uid, selectedAccountId, startDate, endDate),
        ]);

        setAnalyticsData(analytics);
        setTopPosts(posts);
        setOptimalTimes(times);
        setGrowth(accountGrowth);
        setPostsSummary(summary);

        // Generate insights from posts
        const insightsData = await generateInsights(
          analytics,
          currentUser.uid,
          selectedAccountId,
          startDate,
          endDate
        );
        setInsights(insightsData);

        if (selectedAccount?.lastSyncedAt) {
          setLastSync(selectedAccount.lastSyncedAt);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast({
          title: 'Error loading analytics',
          description: 'Failed to load analytics data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [currentUser, selectedAccountId, days, selectedAccount?.lastSyncedAt]);

  const summary = useMemo(() => {
    const followersChange = analyticsData.length >= 2
      ? analyticsData[analyticsData.length - 1].followersCount - analyticsData[0].followersCount
      : 0;

    // Get follower count from latest analytics data or fall back to account
    const totalFollowers = analyticsData.length > 0
      ? analyticsData[analyticsData.length - 1].followersCount
      : (selectedAccount?.followersCount || 0);

    return {
      totalFollowers,
      followersChange,
      totalEngagements: postsSummary.totalEngagements,
      avgEngagementRate: postsSummary.avgEngagementRate,
      totalPosts: postsSummary.totalPosts,
    };
  }, [analyticsData, selectedAccount, postsSummary]);

  const handleRefresh = async () => {
    if (!currentUser || !selectedAccountId) return;

    setRefreshing(true);
    try {
      const refreshFn = httpsCallable(functions, 'refreshAccountAnalytics');
      await refreshFn({ accountId: selectedAccountId });

      toast({
        title: 'Analytics refreshed',
        description: 'Your analytics data has been updated from Threads.',
      });

      setLastSync(new Date());

      // Wait a moment for Firestore to sync, then reload account data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [analytics, posts, times, accountGrowth, summary] = await Promise.all([
        getAccountAnalytics(currentUser.uid, selectedAccountId, startDate, endDate),
        getTopPosts(currentUser.uid, selectedAccountId, 10, startDate, endDate),
        calculateOptimalTimes(currentUser.uid, selectedAccountId, days),
        getAccountGrowth(currentUser.uid, selectedAccountId, days),
        getPostsSummary(currentUser.uid, selectedAccountId, startDate, endDate),
      ]);

      setAnalyticsData(analytics);
      setTopPosts(posts);
      setOptimalTimes(times);
      setGrowth(accountGrowth);
      setPostsSummary(summary);

      // Generate insights from posts
      const insightsData = await generateInsights(
        analytics,
        currentUser.uid,
        selectedAccountId,
        startDate,
        endDate
      );
      setInsights(insightsData);
    } catch (error: any) {
      console.error('Error refreshing analytics:', error);
      toast({
        title: 'Refresh failed',
        description: error.message || 'Failed to refresh analytics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    if (analyticsData.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There is no analytics data available to export.',
        variant: 'destructive',
      });
      return;
    }

    const csv = exportAnalyticsToCSV(analyticsData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedAccount?.username || 'data'}-${timeframe}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Analytics exported',
      description: `Analytics data has been exported to CSV.`,
    });
  };

  if (!selectedAccount) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Account Selected</CardTitle>
            <CardDescription>
              Please add an account from the Dashboard to view analytics.
            </CardDescription>
          </CardHeader>
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
            Track your performance and growth on Threads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={analyticsData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Account & Timeframe Selectors */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    @{account.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Timeframe</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as AnalyticsTimeframe)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      {lastSync && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Last synced: {lastSync.toLocaleString()}. Data updates daily at 2 AM UTC.
          </AlertDescription>
        </Alert>
      )}

      {/* No Data Alert */}
      {!loading && analyticsData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No analytics data yet.</strong> Analytics are collected daily. Click "Refresh" to fetch your latest data from Threads.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalFollowers.toLocaleString()}</div>
                {summary.followersChange !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {summary.followersChange > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">+{summary.followersChange.toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        <span className="text-red-500">{summary.followersChange.toLocaleString()}</span>
                      </>
                    )}
                    <span>this period</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalPosts}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Published in this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagements</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEngagements.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total likes, replies & reposts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary.avgEngagementRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all posts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            <FollowerGrowthChart data={growth?.chartData || []} />
            <InsightsPanel insights={insights} />
          </div>

          <TopPostsTable posts={topPosts} />

          <OptimalTimes timeSlots={optimalTimes} />
        </>
      )}
    </div>
  );
};
