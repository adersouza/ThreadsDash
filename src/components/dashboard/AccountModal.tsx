import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
  });

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

    try {
      setLoading(true);

      // Create account in Firestore
      await addDoc(collection(db, 'users', currentUser.uid, 'accounts'), {
        username: formData.username.replace('@', ''), // Remove @ if present
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl: null,
        postingMethod: 'browser', // Default to browser method
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Account added',
        description: `Successfully added @${formData.username}`,
      });

      // Reset form and close modal
      setFormData({ username: '', displayName: '', bio: '' });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Threads Account</DialogTitle>
          <DialogDescription>
            Add a new Threads account to manage with ThreadsDash
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="@username or just username"
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
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Notes about this account..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={loading}
                rows={3}
              />
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
      </DialogContent>
    </Dialog>
  );
};
