import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearError: () => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
    }),

  setProfile: (profile) =>
    set({
      profile,
    }),

  setIsLoading: (isLoading) =>
    set({
      isLoading,
    }),

  setAuthError: (authError) =>
    set({
      authError,
      isLoading: false,
    }),

  clearError: () =>
    set({
      authError: null,
    }),

  resetAuth: () =>
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    }),
}));
