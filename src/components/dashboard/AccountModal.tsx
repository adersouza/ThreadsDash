import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { encrypt } from '@/services/encryption';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountModal = ({ open, onOpenChange }: AccountModalProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    instagramToken: '',
    instagramUserId: '',
    baselineFollowers: '',
    baselineFollowing: '',
    baselinePosts: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.username || !formData.displayName) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in username and display name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.instagramToken || !formData.instagramUserId) {
      toast({
        title: 'Missing credentials',
        description: 'Please fill in Instagram token and user ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Encrypt Instagram token
      const encryptedToken = await encrypt(formData.instagramToken);

      // Parse baseline values (default to 0 if not provided)
      const baselineFollowers = formData.baselineFollowers ? parseInt(formData.baselineFollowers) : 0;
      const baselineFollowing = formData.baselineFollowing ? parseInt(formData.baselineFollowing) : 0;
      const baselinePosts = formData.baselinePosts ? parseInt(formData.baselinePosts) : 0;

      // Create account in Firestore
      await addDoc(collection(db, 'users', currentUser.uid, 'accounts'), {
        username: formData.username.replace('@', ''), // Remove @ if present
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl: null,
        postingMethod: 'api', // Default to API method since we have credentials
        instagramToken: encryptedToken,
        instagramUserId: formData.instagramUserId,
        isActive: true,
        // Analytics baseline - track initial metrics when account is added
        baselineFollowersCount: baselineFollowers,
        baselineFollowingCount: baselineFollowing,
        baselinePostsCount: baselinePosts,
        followersCount: baselineFollowers, // Set current count to baseline initially
        followingCount: baselineFollowing,
        postsCount: baselinePosts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Account added',
        description: `Successfully added @${formData.username}`,
      });

      // Reset form and close modal
      setFormData({
        username: '',
        displayName: '',
        bio: '',
        instagramToken: '',
        instagramUserId: '',
        baselineFollowers: '',
        baselineFollowing: '',
        baselinePosts: '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: 'Error',
        description: 'Failed to add account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!currentUser || !csvFile) return;

    try {
      setLoading(true);

      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      const batch = writeBatch(db);
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        const [username, token, userId] = line.split(':').map(s => s.trim());

        if (!username || !token || !userId) {
          errorCount++;
          continue;
        }

        try {
          const encryptedToken = await encrypt(token);
          const accountRef = doc(collection(db, 'users', currentUser.uid, 'accounts'));

          batch.set(accountRef, {
            username: username.replace('@', ''),
            displayName: username.replace('@', ''),
            bio: '',
            avatarUrl: null,
            postingMethod: 'api',
            instagramToken: encryptedToken,
            instagramUserId: userId,
            isActive: true,
            // Analytics baseline - default to 0 for bulk imports
            baselineFollowersCount: 0,
            baselineFollowingCount: 0,
            baselinePostsCount: 0,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          successCount++;
        } catch (error) {
          console.error(`Error processing line: ${line}`, error);
          errorCount++;
        }
      }

      await batch.commit();

      toast({
        title: 'Bulk import complete',
        description: `Added ${successCount} accounts. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      });

      setCsvFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error bulk importing accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to import accounts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Threads Account(s)</DialogTitle>
          <DialogDescription>
            Add one or multiple Threads accounts to manage
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Account</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
          </TabsList>

          {/* Single Account Tab */}
          <TabsContent value="single">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="username"
                    placeholder="@username or username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="My Main Account"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instagramToken">
                    Instagram Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="instagramToken"
                    type="password"
                    placeholder="eyJkc191c2VyX2lkIjo..."
                    value={formData.instagramToken}
                    onChange={(e) => setFormData({ ...formData, instagramToken: e.target.value })}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Extract this from Threads.net network requests
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instagramUserId">
                    Instagram User ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="instagramUserId"
                    placeholder="1234567890"
                    value={formData.instagramUserId}
                    onChange={(e) => setFormData({ ...formData, instagramUserId: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio (optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Notes about this account..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={loading}
                    rows={2}
                  />
                </div>

                {/* Analytics Baseline */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label className="text-base font-semibold">Analytics Baseline (Optional)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter current metrics to track growth from this point. Leave empty to start from 0.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="baselineFollowers">Followers</Label>
                      <Input
                        id="baselineFollowers"
                        type="number"
                        placeholder="800"
                        value={formData.baselineFollowers}
                        onChange={(e) => setFormData({ ...formData, baselineFollowers: e.target.value })}
                        disabled={loading}
                        min="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="baselineFollowing">Following</Label>
                      <Input
                        id="baselineFollowing"
                        type="number"
                        placeholder="100"
                        value={formData.baselineFollowing}
                        onChange={(e) => setFormData({ ...formData, baselineFollowing: e.target.value })}
                        disabled={loading}
                        min="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="baselinePosts">Posts</Label>
                      <Input
                        id="baselinePosts"
                        type="number"
                        placeholder="50"
                        value={formData.baselinePosts}
                        onChange={(e) => setFormData({ ...formData, baselinePosts: e.target.value })}
                        disabled={loading}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Account
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>CSV File Format</Label>
                <div className="bg-muted p-3 rounded-md">
                  <code className="text-xs">
                    username:token:userId<br />
                    sweetestmiaxfuego:eyJkc191c2VyX2lkIjo...:76571767086<br />
                    another_account:eyJkc191c2VyX2lkIjo...:12345678901
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each line: username:instagramToken:instagramUserId
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              {csvFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{csvFile.name}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkImport} disabled={loading || !csvFile}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Accounts
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
