import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountModal = ({ open, onOpenChange }: AccountModalProps) => {
  const handleOAuthConnect = () => {
    const authUrl = new URL('https://threads.net/oauth/authorize');
    authUrl.searchParams.set('client_id', '1620825335945838');
    authUrl.searchParams.set('redirect_uri', 'https://threadsdash.web.app/auth/threads/callback');
    authUrl.searchParams.set('scope', 'threads_basic,threads_content_publish,threads_manage_insights');
    authUrl.searchParams.set('response_type', 'code');
    window.location.href = authUrl.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Threads Account</DialogTitle>
          <DialogDescription>
            Connect your Threads account using OAuth
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Official Threads API</strong>
              <p className="mt-2">Connect your Threads account securely using the official Meta OAuth flow.</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Secure and reliable</li>
                <li>No manual cookie extraction needed</li>
                <li>Long-lived access tokens (60 days)</li>
                <li>Official Meta best practices</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <Button
              size="lg"
              onClick={handleOAuthConnect}
            >
              Connect with Threads
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              You'll be redirected to Threads to authorize this app
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
