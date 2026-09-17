import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export interface AuthState {
  // Session Token & Expiry
  accessToken: string | null;
  expiresAt: number | null; // UNIX timestamp in seconds

  // Identity & Profile
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  setSession: (session: {
    accessToken?: string | null;
    expiresAt?: number | null;
    user: User | null;
    profile?: Profile | null;
  }) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearError: () => void;
  resetAuth: () => void;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  expiresAt: null,
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  setSession: ({ accessToken = null, expiresAt = null, user, profile }) =>
    set((state) => ({
      accessToken: accessToken ?? state.accessToken,
      expiresAt: expiresAt ?? state.expiresAt,
      user,
      profile: profile !== undefined ? profile : state.profile,
      isAuthenticated: Boolean(user),
      isLoading: false,
      authError: null,
    })),

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
      accessToken: null,
      expiresAt: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    }),

  isTokenExpired: () => {
    const { expiresAt, isAuthenticated } = get();
    if (!isAuthenticated || !expiresAt) return false;
    // Buffer by 10 seconds to handle network latency
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= expiresAt - 10;
  },
}));
