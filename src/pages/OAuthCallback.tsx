/**
 * OAuth Callback Page
 * Handles redirect from Threads OAuth authorization
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { functions } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authorization...');
  const [accountInfo, setAccountInfo] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if user is authenticated
        if (!currentUser) {
          setStatus('error');
          setMessage('You must be logged in to connect a Threads account');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Get authorization code from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${errorDescription || error}`);
          setTimeout(() => navigate('/dashboard'), 5000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        // Exchange code for access token via Cloud Function
        setMessage('Exchanging authorization code for access token...');

        const threadsOAuthCallback = httpsCallable(functions, 'threadsOAuthCallback');
        const result = await threadsOAuthCallback({
          code,
          redirectUri: import.meta.env.VITE_THREADS_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
        });

        const data = result.data as any;

        if (data.success) {
          setStatus('success');
          setMessage(`Successfully connected @${data.username}!`);
          setAccountInfo(data);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to connect account');
          setTimeout(() => navigate('/dashboard'), 5000);
        }
      } catch (error: any) {
        console.error('Error in OAuth callback:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to complete authorization');
        setTimeout(() => navigate('/dashboard'), 5000);
      }
    };

    handleCallback();
  }, [searchParams, currentUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting Account</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {accountInfo && (
                <Alert className="text-left">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Username:</strong> @{accountInfo.username}</p>
                      <p><strong>Token expires:</strong> {new Date(accountInfo.expiresAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your token will be automatically refreshed before it expires
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
              <Alert variant="destructive" className="text-left mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
              <p className="text-sm text-gray-500 mt-4">Auto-redirecting in 5 seconds...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
