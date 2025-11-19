/**
 * Posting Method Settings Component
 *
 * Allows users to configure how posts are published:
 * - Browser automation via AdsPower
 * - Unofficial Instagram/Threads API
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import {
  getAdsPowerProfiles,
  testAdsPowerConnection,
} from '@/services/adsPowerService';
import { loginToInstagram } from '@/services/threadsApiUnofficial';
import { encryptSync } from '@/services/encryption';
import {
  Chrome,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';
import type { ThreadsAccount, AdsPowerProfile } from '@/types';

interface PostingMethodSettingsProps {
  account: ThreadsAccount;
  onUpdate: (updates: Partial<ThreadsAccount>) => void;
}

export const PostingMethodSettings = ({ account, onUpdate }: PostingMethodSettingsProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [postingMethod, setPostingMethod] = useState<'browser' | 'api'>(
    account.postingMethod || 'browser'
  );
  const [adsPowerProfiles, setAdsPowerProfiles] = useState<AdsPowerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(account.adsPowerProfileId || '');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramPassword, setInstagramPassword] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adsPowerStatus, setAdsPowerStatus] = useState<'unknown' | 'connected' | 'disconnected'>(
    'unknown'
  );

  // Load AdsPower profiles on mount
  useEffect(() => {
    loadAdsPowerProfiles();
    checkAdsPowerConnection();
  }, []);

  const loadAdsPowerProfiles = async () => {
    const result = await getAdsPowerProfiles();
    if (result.success && result.profiles) {
      setAdsPowerProfiles(result.profiles);
    }
  };

  const checkAdsPowerConnection = async () => {
    const result = await testAdsPowerConnection();
    setAdsPowerStatus(result.success ? 'connected' : 'disconnected');
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);

    try {
      if (postingMethod === 'browser') {
        // Test AdsPower connection
        const result = await testAdsPowerConnection();
        if (result.success) {
          toast({
            title: 'Connection successful',
            description: `AdsPower is running (version ${result.version || 'unknown'})`,
          });
          setAdsPowerStatus('connected');
        } else {
          toast({
            title: 'Connection failed',
            description: result.error || 'Could not connect to AdsPower',
            variant: 'destructive',
          });
          setAdsPowerStatus('disconnected');
        }
      } else if (postingMethod === 'api') {
        // Test Instagram login
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

      if (postingMethod === 'browser') {
        if (!selectedProfileId) {
          toast({
            title: 'Profile required',
            description: 'Please select an AdsPower profile',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        updates.adsPowerProfileId = selectedProfileId;
      } else if (postingMethod === 'api') {
        if (!instagramUsername || !instagramPassword) {
          toast({
            title: 'Credentials required',
            description: 'Please enter Instagram credentials',
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
        const encryptedToken = encryptSync(loginResult.token);
        updates.instagramToken = encryptedToken;
        updates.instagramUserId = loginResult.userId;
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
              {/* Browser Method Card */}
              <div
                onClick={() => setPostingMethod('browser')}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  postingMethod === 'browser'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Chrome className="h-6 w-6 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Browser Automation</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Uses real browser with AdsPower profiles. Safest method, bypasses bot
                      detection.
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Most realistic</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Safest for account</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span>Slower (~30s per post)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Method Card */}
              <div
                onClick={() => setPostingMethod('api')}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  postingMethod === 'api'
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
          {postingMethod === 'browser' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>AdsPower Status</Label>
                <Badge
                  variant={adsPowerStatus === 'connected' ? 'default' : 'destructive'}
                >
                  {adsPowerStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              {adsPowerStatus === 'disconnected' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    AdsPower is not running. Please start AdsPower application first.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="adspower-profile">AdsPower Profile</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger id="adspower-profile">
                    <SelectValue placeholder="Select AdsPower profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {adsPowerProfiles.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No profiles found
                      </SelectItem>
                    ) : (
                      adsPowerProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the AdsPower profile to use for posting. Make sure you're logged into
                  Threads in this profile.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={loadAdsPowerProfiles}
                className="w-full"
              >
                Refresh Profiles
              </Button>
            </div>
          )}

          {postingMethod === 'api' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This method uses reverse-engineered Instagram API
                  endpoints. Use at your own risk. Your account may be flagged or banned.
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

              {account.instagramToken && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Instagram credentials configured
                  </span>
                </div>
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
