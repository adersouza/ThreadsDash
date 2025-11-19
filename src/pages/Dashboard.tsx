import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">ThreadsDash</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {currentUser?.displayName || currentUser?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to ThreadsDash!</h2>
          <p className="text-muted-foreground">
            Your Threads account management dashboard is ready to go.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Manage your Threads accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0</div>
              <p className="text-sm text-muted-foreground mt-2">
                No accounts connected yet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
              <CardDescription>Total posts published</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0</div>
              <p className="text-sm text-muted-foreground mt-2">
                Start creating content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
              <CardDescription>Total engagement rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0%</div>
              <p className="text-sm text-muted-foreground mt-2">
                No data available yet
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to set up your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Connect your first Threads account</li>
              <li>Import your existing posts</li>
              <li>Schedule new content</li>
              <li>Monitor your analytics</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
