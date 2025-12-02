/**
 * Posting Method Settings Component
 *
 * Allows users to configure how posts are published:
 * - OAuth (official Threads API)
 * - Unofficial Instagram/Threads API
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { loginToInstagram } from '@/services/threadsApiUnofficial';
import { encrypt } from '@/services/encryption';
import {
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react';
import type { ThreadsAccount } from '@/types';

interface PostingMethodSettingsProps {
  account: ThreadsAccount;
  onUpdate: (updates: Partial<ThreadsAccount>) => void;
}

export const PostingMethodSettings = ({ account, onUpdate }: PostingMethodSettingsProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [postingMethod, setPostingMethod] = useState<'oauth' | 'unofficial'>(
    account.postingMethod === 'oauth' ? 'oauth' : 'unofficial'
  );
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramPassword, setInstagramPassword] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);

    try {
      if (postingMethod === 'oauth') {
        // OAuth method - check if token exists
        if (account.threadsUserId) {
          toast({
            title: 'OAuth configured',
            description: 'Threads OAuth is already set up for this account',
          });
        } else {
          toast({
            title: 'OAuth not configured',
            description: 'Please connect your Threads account via OAuth',
            variant: 'destructive',
          });
        }
      } else if (postingMethod === 'unofficial') {
        // Check if credentials already configured
        if (account.instagramToken && account.instagramUserId) {
          toast({
            title: 'Credentials configured',
            description: 'Instagram token and user ID are already set up for this account',
          });
          return;
        }

        // Test Instagram login with username/password
        if (!instagramUsername || !instagramPassword) {
          toast({
            title: 'Missing credentials',
            description: 'Please enter Instagram username and password',
            variant: 'destructive',
          });
          return;
        }

        const result = await loginToInstagram(instagramUsername, instagramPassword);
        if (result.success) {
          toast({
            title: 'Login successful',
            description: 'Instagram credentials verified',
          });
        } else {
          toast({
            title: 'Login failed',
            description: result.error || 'Could not authenticate with Instagram',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);

    try {
      const updates: Partial<ThreadsAccount> = {
        postingMethod,
      };

      if (postingMethod === 'unofficial') {
        // Check if credentials already exist from account setup
        if (account.instagramToken && account.instagramUserId) {
          // Credentials already configured, just update posting method
          // No need to do anything else - token already stored
        } else {
          // No credentials yet, need to login with username/password
          if (!instagramUsername || !instagramPassword) {
            toast({
              title: 'Credentials required',
              description: 'Please enter Instagram credentials or add them when adding the account',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }

          // Login to get token
          const loginResult = await loginToInstagram(instagramUsername, instagramPassword);
          if (!loginResult.success || !loginResult.token || !loginResult.userId) {
            toast({
              title: 'Login failed',
              description: loginResult.error || 'Could not authenticate',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }

          // Encrypt and save token
          const encryptedToken = await encrypt(loginResult.token);
          updates.instagramToken = encryptedToken;
          updates.instagramUserId = loginResult.userId;
        }
      }

      // Update Firestore
      const accountRef = doc(db, 'users', currentUser.uid, 'accounts', account.id);
      await updateDoc(accountRef, updates);

      // Update local state
      onUpdate(updates);

      toast({
        title: 'Settings saved',
        description: 'Posting method configuration updated successfully',
      });

      // Clear password field
      setInstagramPassword('');
    } catch (error) {
      console.error('Error saving posting method:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Posting Method Configuration
          </CardTitle>
          <CardDescription>
            Choose how you want to publish posts to Threads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method Selection */}
          <div className="space-y-4">
            <Label>Select Posting Method</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* OAuth Method Card */}
              <div
                onClick={() => setPostingMethod('oauth')}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  postingMethod === 'oauth'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">OAuth (Official)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Official Threads API via OAuth. Safest and most reliable method.
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Official API</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Safest for account</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span>Fast (~2s)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unofficial API Method Card */}
              <div
                onClick={() => setPostingMethod('unofficial')}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  postingMethod === 'unofficial'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Zap className="h-6 w-6 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Unofficial API</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Direct API calls to Instagram/Threads. Fast but unofficial.
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span>Very fast (~2s)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span>Unofficial/unsupported</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>Higher risk</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration based on selected method */}
          {postingMethod === 'oauth' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {account.threadsUserId ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      OAuth connected
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Threads account is connected via OAuth. This is the recommended method.
                    </p>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    OAuth is not configured for this account. Please connect your Threads account via OAuth when adding the account.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {postingMethod === 'unofficial' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This method uses reverse-engineered Instagram API
                  endpoints. Use at your own risk. Your account may be flagged or banned.
                </AlertDescription>
              </Alert>

              {account.instagramToken && account.instagramUserId ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Instagram credentials already configured
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your Instagram token and user ID were provided when you added this account.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You're all set! Simply save the configuration below to use the API posting method.
                  </p>
                </div>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No Instagram credentials found. Please add them when adding the account, or enter them below.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="instagram-username">Instagram Username</Label>
                    <Input
                      id="instagram-username"
                      type="text"
                      placeholder="your_instagram_username"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram-password">Instagram Password</Label>
                    <Input
                      id="instagram-password"
                      type="password"
                      placeholder="Your Instagram password"
                      value={instagramPassword}
                      onChange={(e) => setInstagramPassword(e.target.value)}
                      disabled={isSaving}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your password is encrypted before being stored.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Rate Limiting Info */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Rate Limiting:</strong> To protect your account, posting is limited to 3
              posts per hour, 20 per day, with a minimum 15-minute delay between posts.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>

          {/* Last Post Info */}
          {account.lastPostAt && (
            <div className="text-sm text-muted-foreground">
              Last post: {new Date(account.lastPostAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
