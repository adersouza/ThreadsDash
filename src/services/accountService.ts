import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Update account's assigned models
 */
export async function updateAccountModels(
  userId: string,
  accountId: string,
  modelIds: string[]
): Promise<void> {
  const accountRef = doc(db, 'users', userId, 'accounts', accountId);
  await updateDoc(accountRef, {
    modelIds,
  });
}
