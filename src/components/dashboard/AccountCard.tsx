import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp } from 'lucide-react';
import type { ThreadsAccount } from '@/types';
import { useAccountStore } from '@/store/accountStore';
import { cn } from '@/lib/utils';

interface AccountCardProps {
  account: ThreadsAccount;
}

export const AccountCard = ({ account }: AccountCardProps) => {
  const { selectedAccount, setSelectedAccount } = useAccountStore();
  const isSelected = selectedAccount?.id === account.id;

  // Calculate engagement rate (simplified for now)
  const engagementRate = account.followersCount > 0
    ? Math.min(((account.postsCount * 10) / account.followersCount) * 100, 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'destructive';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'suspended':
        return 'Suspended';
      case 'pending':
        return 'Pending';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => setSelectedAccount(account)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={account.profilePictureUrl} alt={account.username} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                {account.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{account.username}</h3>
                {account.isVerified && (
                  <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{account.displayName}</p>
            </div>
          </div>
          <Badge variant={getStatusColor(account.status)}>
            {getStatusLabel(account.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Followers</p>
              <p className="font-semibold text-sm">{formatNumber(account.followersCount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Engagement</p>
              <p className="font-semibold text-sm">{engagementRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Engagement Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Engagement Rate</span>
            <span className="font-medium">{engagementRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all"
              style={{ width: `${engagementRate}%` }}
            />
          </div>
        </div>

        {/* Last Synced */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last synced: {account.lastSyncedAt.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
