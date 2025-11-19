import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThreadsAccount, ThreadsPost, AccountAnalytics } from '@/types';

interface AccountState {
  // State
  accounts: ThreadsAccount[];
  selectedAccount: ThreadsAccount | null;
  posts: ThreadsPost[];
  analytics: AccountAnalytics[];
  loading: boolean;
  error: string | null;

  // Actions
  setAccounts: (accounts: ThreadsAccount[]) => void;
  addAccount: (account: ThreadsAccount) => void;
  updateAccount: (id: string, updates: Partial<ThreadsAccount>) => void;
  deleteAccount: (id: string) => void;
  setSelectedAccount: (account: ThreadsAccount | null) => void;

  setPosts: (posts: ThreadsPost[]) => void;
  addPost: (post: ThreadsPost) => void;
  updatePost: (id: string, updates: Partial<ThreadsPost>) => void;
  deletePost: (id: string) => void;

  setAnalytics: (analytics: AccountAnalytics[]) => void;
  addAnalytics: (analytics: AccountAnalytics) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  accounts: [],
  selectedAccount: null,
  posts: [],
  analytics: [],
  loading: false,
  error: null,
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      ...initialState,

      // Account actions
      setAccounts: (accounts) => set({ accounts }),

      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id === id ? { ...account, ...updates } : account
          ),
          selectedAccount:
            state.selectedAccount?.id === id
              ? { ...state.selectedAccount, ...updates }
              : state.selectedAccount,
        })),

      deleteAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((account) => account.id !== id),
          selectedAccount:
            state.selectedAccount?.id === id ? null : state.selectedAccount,
        })),

      setSelectedAccount: (account) => set({ selectedAccount: account }),

      // Post actions
      setPosts: (posts) => set({ posts }),

      addPost: (post) =>
        set((state) => ({
          posts: [post, ...state.posts],
        })),

      updatePost: (id, updates) =>
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === id ? { ...post, ...updates } : post
          ),
        })),

      deletePost: (id) =>
        set((state) => ({
          posts: state.posts.filter((post) => post.id !== id),
        })),

      // Analytics actions
      setAnalytics: (analytics) => set({ analytics }),

      addAnalytics: (analytics) =>
        set((state) => ({
          analytics: [...state.analytics, analytics],
        })),

      // Utility actions
      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'threadsdash-account-storage',
      partialize: (state) => ({
        accounts: state.accounts,
        selectedAccount: state.selectedAccount,
      }),
    }
  )
);
