import { useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useModelStore } from '@/store/modelStore';
import type { Model } from '@/types';

export const useModels = () => {
  const { currentUser } = useAuth();
  const { setModels, setLoading, setError } = useModelStore();

  useEffect(() => {
    if (!currentUser) {
      setModels([]);
      return;
    }

    setLoading(true);

    const modelsRef = collection(db, 'users', currentUser.uid, 'models');
    const q = query(modelsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const models: Model[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          models.push({
            id: doc.id,
            userId: data.userId,
            name: data.name,
            description: data.description,
            color: data.color,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        });
        setModels(models);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching models:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, setModels, setLoading, setError]);

  return {
    isInitialized: true,
  };
};
