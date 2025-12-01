import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { QueueSlot } from '@/types';

/**
 * Create a new queue time slot for an account
 */
export async function createQueueSlot(
  userId: string,
  accountId: string,
  dayOfWeek: number,
  timeSlot: string
): Promise<string> {
  const slotsRef = collection(db, 'users', userId, 'queueSlots');
  const docRef = await addDoc(slotsRef, {
    userId,
    accountId,
    dayOfWeek,
    timeSlot,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all queue slots for an account
 */
export async function getAccountQueueSlots(
  userId: string,
  accountId: string
): Promise<QueueSlot[]> {
  const slotsRef = collection(db, 'users', userId, 'queueSlots');
  const q = query(
    slotsRef,
    where('accountId', '==', accountId),
    orderBy('dayOfWeek', 'asc')
  );

  const snapshot = await getDocs(q);
  const slots: QueueSlot[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    slots.push({
      id: doc.id,
      userId: data.userId,
      accountId: data.accountId,
      dayOfWeek: data.dayOfWeek,
      timeSlot: data.timeSlot,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  return slots;
}

/**
 * Delete a queue slot
 */
export async function deleteQueueSlot(userId: string, slotId: string): Promise<void> {
  const slotDoc = doc(db, 'users', userId, 'queueSlots', slotId);
  await deleteDoc(slotDoc);
}

/**
 * Toggle a queue slot's active status
 */
export async function toggleQueueSlot(userId: string, slotId: string, isActive: boolean): Promise<void> {
  const slotDoc = doc(db, 'users', userId, 'queueSlots', slotId);
  await updateDoc(slotDoc, {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get the next available queue slot for an account
 */
export async function getNextAvailableSlot(
  userId: string,
  accountId: string
): Promise<Date | null> {
  const slots = await getAccountQueueSlots(userId, accountId);
  const activeSlots = slots.filter((slot) => slot.isActive);

  if (activeSlots.length === 0) {
    return null;
  }

  // Get all scheduled posts for this account
  const postsRef = collection(db, 'users', userId, 'posts');
  const postsQuery = query(
    postsRef,
    where('accountId', '==', accountId),
    where('status', '==', 'scheduled')
  );
  const postsSnapshot = await getDocs(postsQuery);

  const scheduledTimes = new Set<string>();
  postsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.scheduledFor) {
      const scheduledDate = data.scheduledFor.toDate();
      scheduledTimes.add(scheduledDate.toISOString());
    }
  });

  // Find the next available slot
  const now = new Date();
  const daysToCheck = 30; // Check next 30 days

  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);

    const dayOfWeek = checkDate.getDay();

    // Find slots for this day of week
    const daySlots = activeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);

    for (const slot of daySlots) {
      // Parse time slot (format: "HH:mm")
      const [hours, minutes] = slot.timeSlot.split(':').map(Number);

      const slotDate = new Date(checkDate);
      slotDate.setHours(hours, minutes, 0, 0);

      // Skip if slot is in the past
      if (slotDate <= now) {
        continue;
      }

      // Check if this slot is already taken
      if (!scheduledTimes.has(slotDate.toISOString())) {
        return slotDate;
      }
    }
  }

  return null;
}

/**
 * Schedule a post to the next available queue slot
 */
export async function schedulePostToQueue(
  userId: string,
  postId: string,
  accountId: string
): Promise<Date | null> {
  const nextSlot = await getNextAvailableSlot(userId, accountId);

  if (!nextSlot) {
    throw new Error('No available queue slots. Please add time slots first.');
  }

  // Update post with scheduled time
  const postDoc = doc(db, 'users', userId, 'posts', postId);
  await updateDoc(postDoc, {
    status: 'scheduled',
    scheduledFor: nextSlot,
    updatedAt: serverTimestamp(),
  });

  return nextSlot;
}

/**
 * Add multiple posts to the queue in order
 */
export async function addPostsToQueue(
  userId: string,
  postIds: string[],
  accountId: string
): Promise<void> {
  for (const postId of postIds) {
    await schedulePostToQueue(userId, postId, accountId);
  }
}
