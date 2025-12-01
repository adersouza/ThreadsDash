import { create } from 'zustand';
import type { QueueSlot } from '@/types';

interface QueueStore {
  slots: QueueSlot[];
  loading: boolean;
  error: string | null;

  // Actions
  setSlots: (slots: QueueSlot[]) => void;
  addSlot: (slot: QueueSlot) => void;
  updateSlot: (slotId: string, updates: Partial<QueueSlot>) => void;
  removeSlot: (slotId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  slots: [],
  loading: false,
  error: null,

  setSlots: (slots) => set({ slots }),
  addSlot: (slot) =>
    set((state) => ({
      slots: [...state.slots, slot].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.timeSlot.localeCompare(b.timeSlot);
      }),
    })),
  updateSlot: (slotId, updates) =>
    set((state) => ({
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, ...updates } : s)),
    })),
  removeSlot: (slotId) =>
    set((state) => ({
      slots: state.slots.filter((s) => s.id !== slotId),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
