import { create } from 'zustand';
import type { MediaFile } from '@/types';

interface MediaStore {
  media: MediaFile[];
  selectedMedia: MediaFile | null;
  loading: boolean;
  error: string | null;
  uploadProgress: number;

  // Actions
  setMedia: (media: MediaFile[]) => void;
  setSelectedMedia: (media: MediaFile | null) => void;
  addMedia: (media: MediaFile) => void;
  updateMedia: (mediaId: string, updates: Partial<MediaFile>) => void;
  removeMedia: (mediaId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUploadProgress: (progress: number) => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  media: [],
  selectedMedia: null,
  loading: false,
  error: null,
  uploadProgress: 0,

  setMedia: (media) => set({ media }),
  setSelectedMedia: (selectedMedia) => set({ selectedMedia }),
  addMedia: (media) =>
    set((state) => ({
      media: [media, ...state.media],
    })),
  updateMedia: (mediaId, updates) =>
    set((state) => ({
      media: state.media.map((m) => (m.id === mediaId ? { ...m, ...updates } : m)),
    })),
  removeMedia: (mediaId) =>
    set((state) => ({
      media: state.media.filter((m) => m.id !== mediaId),
      selectedMedia: state.selectedMedia?.id === mediaId ? null : state.selectedMedia,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
}));
