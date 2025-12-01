import { useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaStore } from '@/store/mediaStore';
import type { MediaFile } from '@/types';

export const useMedia = () => {
  const { currentUser } = useAuth();
  const { setMedia, setLoading, setError } = useMediaStore();

  useEffect(() => {
    if (!currentUser) {
      setMedia([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for user's media
    const mediaRef = collection(db, 'users', currentUser.uid, 'media');
    const q = query(mediaRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const media: MediaFile[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          media.push({
            id: doc.id,
            userId: data.userId,
            fileName: data.fileName,
            originalFileName: data.originalFileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            fileType: data.fileType,
            storageUrl: data.storageUrl,
            thumbnailUrl: data.thumbnailUrl,
            width: data.width,
            height: data.height,
            duration: data.duration,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            usageCount: data.usageCount || 0,
            lastUsedAt: data.lastUsedAt?.toDate(),
            tags: data.tags || [],
            description: data.description,
          });
        });

        setMedia(media);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching media:', error);
        setError(error.message || 'Failed to fetch media');
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser, setMedia, setLoading, setError]);
};
