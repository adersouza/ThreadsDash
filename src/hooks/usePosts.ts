import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePostStore } from '@/store/postStore';
import type { Post, MediaItem } from '@/types/post';

export const usePosts = () => {
  const { currentUser } = useAuth();
  const { setPosts, setLoading, setError } = usePostStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for user's posts
    const postsRef = collection(db, 'users', currentUser.uid, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const posts: Post[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Convert Firestore timestamps to Dates
          const post: Post = {
            id: doc.id,
            userId: data.userId,
            accountId: data.accountId,
            content: data.content || '',
            media: (data.media || []).map((m: any) => ({
              id: m.id,
              type: m.type,
              url: m.url,
              thumbnailUrl: m.thumbnailUrl,
              fileName: m.fileName,
              size: m.size,
              uploadedAt: m.uploadedAt?.toDate() || new Date(),
            } as MediaItem)),
            status: data.status || 'draft',
            scheduledFor: data.scheduledFor?.toDate(),
            publishedAt: data.publishedAt?.toDate(),
            topics: data.topics || [],
            settings: {
              allowReplies: data.settings?.allowReplies ?? true,
              whoCanReply: data.settings?.whoCanReply || 'everyone',
              topics: data.settings?.topics || [],
            },
            performance: data.performance ? {
              views: data.performance.views || 0,
              likes: data.performance.likes || 0,
              replies: data.performance.replies || 0,
              reposts: data.performance.reposts || 0,
              engagementRate: data.performance.engagementRate || 0,
            } : undefined,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            errorMessage: data.errorMessage,
          };

          posts.push(post);
        });

        setPosts(posts);
        setLoading(false);
        setIsInitialized(true);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setError(error.message || 'Failed to fetch posts');
        setLoading(false);
        setIsInitialized(true);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser, setPosts, setLoading, setError]);

  return { isInitialized };
};
