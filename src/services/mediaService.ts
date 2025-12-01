import { storage, db } from './firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import type { MediaFile } from '@/types';

/**
 * Get image dimensions
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Upload media file to Firebase Storage WITHOUT spoofing
 * Images are stored in their original form and spoofed at post-time
 */
export async function uploadMedia(
  userId: string,
  file: File
): Promise<MediaFile> {
  try {
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    let uploadFile: Blob = file;

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${extension}`;
    const storagePath = `users/${userId}/media/${fileName}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, uploadFile, {
      contentType: file.type,
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Get image dimensions if it's an image
    let dimensions = {};
    if (fileType === 'image') {
      try {
        const dims = await getImageDimensions(file);
        dimensions = dims;
      } catch (err) {
        console.error('Failed to get image dimensions:', err);
      }
    }

    // Create media document in Firestore
    const mediaData = {
      userId,
      fileName,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileType,
      storageUrl: downloadURL,
      ...dimensions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usageCount: 0,
      tags: [],
    };

    const mediaRef = collection(db, 'users', userId, 'media');
    const docRef = await addDoc(mediaRef, mediaData);

    return {
      id: docRef.id,
      ...mediaData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MediaFile;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media file');
  }
}

/**
 * Get all media files for a user
 */
export async function getUserMedia(userId: string): Promise<MediaFile[]> {
  try {
    const mediaRef = collection(db, 'users', userId, 'media');
    const q = query(mediaRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

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

    return media;
  } catch (error) {
    console.error('Error fetching media:', error);
    throw new Error('Failed to fetch media files');
  }
}

/**
 * Delete a media file
 */
export async function deleteMedia(userId: string, mediaId: string, fileName: string): Promise<void> {
  try {
    // Delete from Storage
    const storagePath = `users/${userId}/media/${fileName}`;
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Delete from Firestore
    const mediaDoc = doc(db, 'users', userId, 'media', mediaId);
    await deleteDoc(mediaDoc);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw new Error('Failed to delete media file');
  }
}

/**
 * Update media metadata (tags, description)
 */
export async function updateMediaMetadata(
  userId: string,
  mediaId: string,
  updates: {
    tags?: string[];
    description?: string;
  }
): Promise<void> {
  try {
    const mediaDoc = doc(db, 'users', userId, 'media', mediaId);
    await updateDoc(mediaDoc, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating media metadata:', error);
    throw new Error('Failed to update media metadata');
  }
}

/**
 * Increment usage count when media is used in a post
 */
export async function incrementMediaUsage(userId: string, mediaId: string): Promise<void> {
  try {
    const mediaDoc = doc(db, 'users', userId, 'media', mediaId);
    await updateDoc(mediaDoc, {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error incrementing media usage:', error);
    // Don't throw error here, as this is not critical
  }
}

