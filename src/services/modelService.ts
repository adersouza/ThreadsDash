import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Model } from '@/types';

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

/**
 * Create a new model
 */
export async function createModel(
  userId: string,
  name: string,
  description?: string
): Promise<string> {
  const modelsRef = collection(db, 'users', userId, 'models');

  // Assign a random color
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  const docRef = await addDoc(modelsRef, {
    userId,
    name,
    description: description || '',
    color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing model
 */
export async function updateModel(
  userId: string,
  modelId: string,
  updates: Partial<Pick<Model, 'name' | 'description' | 'color'>>
): Promise<void> {
  const modelRef = doc(db, 'users', userId, 'models', modelId);

  await updateDoc(modelRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a model
 */
export async function deleteModel(userId: string, modelId: string): Promise<void> {
  const modelRef = doc(db, 'users', userId, 'models', modelId);
  await deleteDoc(modelRef);

  // Note: We don't remove modelIds from accounts here because the UI will handle orphaned references gracefully
  // You could add logic here to clean up accounts if needed
}
