import { useState } from 'react';
import { useAccountStore } from '@/store/accountStore';
import { usePostStore } from '@/store/postStore';
import { useAccounts } from '@/hooks/useAccounts';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { PostComposer } from '@/components/posts/PostComposer';
import { AccountModal } from '@/components/dashboard/AccountModal';
import { Plus, Loader2, FileText, Calendar, Edit } from 'lucide-react';

export const Dashboard = () => {
  const { accounts, loading, error } = useAccountStore();
  const { posts } = usePostStore();
  const { isInitialized } = useAccounts();
  usePosts();
  const [composerOpen, setComposerOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Calculate post stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const postsToday = posts.filter(
    (p) => p.createdAt && new Date(p.createdAt).setHours(0, 0, 0, 0) === today.getTime()
  ).length;
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled').length;
  const draftPosts = posts.filter((p) => p.status === 'draft').length;

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
        <Button onClick={() => setAccountModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsOverview accounts={accounts} />

      {/* Post Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts Today</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postsToday}</div>
            <p className="text-xs text-muted-foreground">
              Created in the last 24 hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">
              Ready to be published
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Posts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftPosts}</div>
            <p className="text-xs text-muted-foreground">
              Waiting to be scheduled
            </p>
          </CardContent>
        </Card>
      </div>

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
              <Button onClick={() => setAccountModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Action Button for Create Post */}
      <Button
        size="lg"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setComposerOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Modals */}
      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} />
      <AccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} />
    </div>
  );
};
