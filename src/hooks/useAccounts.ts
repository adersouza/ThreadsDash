import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/store/accountStore';
import type { ThreadsAccount } from '@/types';

export const useAccounts = () => {
  const { currentUser } = useAuth();
  const { setAccounts, setLoading, setError } = useAccountStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for user's accounts (subcollection under users/{userId}/accounts)
    const accountsRef = collection(db, 'users', currentUser.uid, 'accounts');
    const q = query(
      accountsRef,
      orderBy('createdAt', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accounts: ThreadsAccount[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          accounts.push({
            id: doc.id,
            userId: data.userId,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio || '',
            profilePictureUrl: data.profilePictureUrl || '',
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            postsCount: data.postsCount || 0,
            isVerified: data.isVerified || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastSyncedAt: data.lastSyncedAt?.toDate() || new Date(),
            status: data.status || 'active',
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            threadsAccessToken: data.threadsAccessToken,
            threadsUserId: data.threadsUserId,
            tokenExpiresAt: data.tokenExpiresAt?.toDate(),
            lastPostAt: data.lastPostAt?.toDate(),
            postsLastHour: data.postsLastHour,
            postsToday: data.postsToday,
            rateLimitResetAt: data.rateLimitResetAt?.toDate(),
            modelIds: data.modelIds || [],
          });
        });

        setAccounts(accounts);
        setLoading(false);
        setIsInitialized(true);
      },
      (error) => {
        console.error('Error fetching accounts:', error);
        setError(error.message || 'Failed to fetch accounts');
        setLoading(false);
        setIsInitialized(true);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser, setAccounts, setLoading, setError]);

  return { isInitialized };
};
