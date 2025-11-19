import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, TrendingUp, UserCheck } from 'lucide-react';
import type { ThreadsAccount } from '@/types';

interface StatsOverviewProps {
  accounts: ThreadsAccount[];
}

export const StatsOverview = ({ accounts }: StatsOverviewProps) => {
  // Calculate stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.status === 'active').length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followersCount, 0);

  // Calculate average engagement rate
  const avgEngagement = accounts.length > 0
    ? accounts.reduce((sum, a) => {
        const engagementRate = a.followersCount > 0
          ? Math.min(((a.postsCount * 10) / a.followersCount) * 100, 100)
          : 0;
        return sum + engagementRate;
      }, 0) / accounts.length
    : 0;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const stats = [
    {
      title: 'Total Accounts',
      value: totalAccounts,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Accounts',
      value: activeAccounts,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Followers',
      value: formatNumber(totalFollowers),
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Avg Engagement',
      value: `${avgEngagement.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
