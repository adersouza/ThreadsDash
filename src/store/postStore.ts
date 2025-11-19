import { create } from 'zustand';
import type { Post } from '@/types/post';

interface PostState {
  // State
  posts: Post[];
  selectedPost: Post | null;
  loading: boolean;
  error: string | null;

  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  selectPost: (post: Post | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  posts: [],
  selectedPost: null,
  loading: false,
  error: null,
};

export const usePostStore = create<PostState>((set) => ({
  ...initialState,

  // Post actions
  setPosts: (posts) => set({ posts }),

  addPost: (post) =>
    set((state) => ({
      posts: [post, ...state.posts],
    })),

  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === id ? { ...post, ...updates, updatedAt: new Date() } : post
      ),
      selectedPost:
        state.selectedPost?.id === id
          ? { ...state.selectedPost, ...updates, updatedAt: new Date() }
          : state.selectedPost,
    })),

  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== id),
      selectedPost: state.selectedPost?.id === id ? null : state.selectedPost,
    })),

  selectPost: (post) => set({ selectedPost: post }),

  // Utility actions
  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
