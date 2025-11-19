import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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

    // Create query for user's accounts
    const accountsRef = collection(db, 'accounts');
    const q = query(
      accountsRef,
      where('userId', '==', currentUser.uid),
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
