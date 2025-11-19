import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PostingMethodSettings } from '@/components/settings/PostingMethodSettings';
import { useAccountStore } from '@/store/accountStore';
import { Settings as SettingsIcon, UserCircle } from 'lucide-react';
import type { ThreadsAccount } from '@/types';

export const Settings = () => {
  const { accounts } = useAccountStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  const handleAccountUpdate = (updates: Partial<ThreadsAccount>) => {
    // Updates will be handled by the PostingMethodSettings component
    // which writes directly to Firestore
    console.log('Account updated:', updates);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and posting configuration
        </p>
      </div>

      {/* Account Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Select Account</CardTitle>
              <CardDescription>
                Choose which account to configure
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account to configure" />
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <SelectItem value="none" disabled>
                  No accounts found
                </SelectItem>
              ) : (
                accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    @{account.username} - {account.displayName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Posting Method Settings */}
      {selectedAccount ? (
        <PostingMethodSettings
          account={selectedAccount}
          onUpdate={handleAccountUpdate}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <SettingsIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle>No Account Selected</CardTitle>
                <CardDescription>
                  Please select an account above to configure posting settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure how posts are published for each account:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mt-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Choose between Browser Automation (safest) or API (fastest)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Configure Instagram credentials for API posting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Select AdsPower profile for browser automation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Test connection to verify setup</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
