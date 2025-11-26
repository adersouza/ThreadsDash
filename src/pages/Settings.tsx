import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountStore } from '@/store/accountStore';
import { Settings as SettingsIcon, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const Settings = () => {
  const { accounts } = useAccountStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Your ThreadsDash configuration
        </p>
      </div>

      {/* API Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Official Threads API</CardTitle>
              <CardDescription>
                All accounts use the secure OAuth posting method
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ThreadsDash uses the <strong>official Threads Graph API</strong> for all posting operations.
              This ensures the highest level of security and reliability.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">What this means:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Secure OAuth authentication</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>No manual cookie extraction needed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Long-lived access tokens (60 days)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Official Meta best practices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Automatic token refresh</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} connected
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts connected yet. Add an account from the Dashboard.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {account.profilePictureUrl && (
                      <img
                        src={account.profilePictureUrl}
                        alt={account.username}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">@{account.username}</p>
                      <p className="text-sm text-muted-foreground">{account.displayName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>OAuth Connected</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            Automatic rate limiting to protect your accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>3 posts per hour</strong> - Maximum posts allowed per account per hour</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>20 posts per day</strong> - Maximum daily posts per account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>15 minute delay</strong> - Minimum time between consecutive posts</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
