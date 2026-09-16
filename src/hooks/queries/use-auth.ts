"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Profile } from "@/types/database";

export const authKeys = {
  all: ["auth"] as const,
  session: ["auth", "session"] as const,
  user: ["auth", "user"] as const,
  profile: (userId?: string) => ["auth", "profile", userId] as const,
};

/**
 * Hook to retrieve current Supabase User and synchronize with Zustand auth store.
 */
export function useUserSession() {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // User not logged in is an expected state, not a throw error
        return null;
      }
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  // Keep Zustand auth store in sync with TanStack Query data
  useEffect(() => {
    if (!query.isLoading) {
      setUser(query.data ?? null);
    }
  }, [query.data, query.isLoading, setUser]);

  // Listen to Supabase auth state changes for Realtime session sync
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      queryClient.setQueryData(authKeys.user, user);
      if (!user) {
        queryClient.removeQueries({ queryKey: authKeys.all });
      } else {
        queryClient.invalidateQueries({ queryKey: authKeys.profile(user.id) });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, queryClient]);

  return query;
}

/**
 * Hook to retrieve User Profile and sorting preferences.
 */
export function useUserProfile(userId?: string) {
  const setProfile = useAuthStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Could not fetch user profile:", error.message);
        return null;
      }
      return data as Profile;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setProfile(query.data);
    }
  }, [query.data, setProfile]);

  return query;
}

export interface GoogleSignInOptions {
  redirectTo?: string;
  next?: string;
}

/**
 * Mutation hook for executing Google OAuth Sign In via TanStack Query.
 */
export function useGoogleSignInMutation() {
  const setAuthError = useAuthStore((state) => state.setAuthError);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  return useMutation({
    mutationFn: async (options?: GoogleSignInOptions) => {
      setIsLoading(true);
      setAuthError(null);

      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const target = options?.redirectTo || options?.next || "/home";
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(target)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onError: (error: Error) => {
      setAuthError(error.message);
      setIsLoading(false);
    },
  });
}

/**
 * Mutation hook for Sign Out via TanStack Query.
 */
export function useSignOutMutation() {
  const resetAuth = useAuthStore((state) => state.resetAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      resetAuth();
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  });
}
