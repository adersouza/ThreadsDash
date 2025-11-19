import { useAccountStore } from '@/store/accountStore';
import { useAccounts } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { Plus, Loader2 } from 'lucide-react';

export const Dashboard = () => {
  const { accounts, loading, error } = useAccountStore();
  const { isInitialized } = useAccounts();

  // Show loading state
  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>Failed to load accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor your Threads accounts
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsOverview accounts={accounts} />

      {/* Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Accounts</h2>
          {accounts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {accounts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Accounts Connected</CardTitle>
              <CardDescription>
                Get started by connecting your first Threads account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Threads account to start managing your content,
                tracking analytics, and scheduling posts.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
