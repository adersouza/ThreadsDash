import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const ThreadsCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      // Get authorization code from URL
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'Authorization was denied');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      if (!currentUser) {
        setStatus('error');
        setError('You must be logged in');
        return;
      }

      try {
        // Call Cloud Function to exchange code for token
        const exchangeToken = httpsCallable(functions, 'exchangeThreadsToken');
        const result = await exchangeToken({ code });

        const data = result.data as { success: boolean; error?: string };

        if (data.success) {
          setStatus('success');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to connect account');
        }
      } catch (err: any) {
        console.error('Error exchanging token:', err);
        setStatus('error');
        setError(err.message || 'Failed to connect account');
      }
    };

    handleCallback();
  }, [searchParams, currentUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Connecting your Threads account...</h2>
            <p className="text-muted-foreground">Please wait</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">Account connected successfully!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Connection failed</h2>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};
