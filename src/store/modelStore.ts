import { create } from 'zustand';
import type { Model } from '@/types';

interface ModelStore {
  models: Model[];
  selectedModelId: string | null; // null means "All Accounts"
  loading: boolean;
  error: string | null;
  setModels: (models: Model[]) => void;
  setSelectedModelId: (modelId: string | null) => void;
  addModel: (model: Model) => void;
  updateModel: (modelId: string, updates: Partial<Model>) => void;
  removeModel: (modelId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  selectedModelId: null,
  loading: false,
  error: null,
  setModels: (models) => set({ models }),
  setSelectedModelId: (modelId) => set({ selectedModelId: modelId }),
  addModel: (model) => set((state) => ({ models: [...state.models, model] })),
  updateModel: (modelId, updates) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === modelId ? { ...m, ...updates } : m)),
    })),
  removeModel: (modelId) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== modelId),
      selectedModelId: state.selectedModelId === modelId ? null : state.selectedModelId,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
