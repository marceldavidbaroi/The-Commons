"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export const authKeys = {
  all: ["auth"] as const,
  session: ["auth", "session"] as const,
  user: ["auth", "user"] as const,
  profile: (userId?: string) => ["auth", "profile", userId] as const,
};

/**
 * Hook to retrieve current Supabase user, access token, and session,
 * synchronizing with Zustand auth store and handling auto-expiry.
 */
export function useUserSession() {
  const setSession = useAuthStore((state) => state.setSession);
  const resetAuth = useAuthStore((state) => state.resetAuth);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: authKeys.user,
    queryFn: async (): Promise<User | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        return null;
      }
      // Sync tokens to Zustand
      setSession({
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at ?? null,
        user: data.session.user,
      });
      return data.session.user;
    },
    staleTime: 2 * 60 * 1000, // 2 mins
  });

  // Keep Zustand auth store in sync with TanStack Query data
  useEffect(() => {
    if (!query.isLoading) {
      if (query.data) {
        setSession({
          user: query.data,
        });
      } else {
        resetAuth();
      }
    }
  }, [query.data, query.isLoading, setSession, resetAuth]);

  // Listen to Supabase auth state changes for Realtime session sync
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        resetAuth();
        queryClient.setQueryData(authKeys.user, null);
        queryClient.setQueryData(authKeys.session, null);
        queryClient.removeQueries({ queryKey: authKeys.all });
      } else {
        setSession({
          accessToken: session.access_token,
          expiresAt: session.expires_at ?? null,
          user: session.user,
        });
        queryClient.setQueryData(authKeys.user, session.user);
        queryClient.setQueryData(authKeys.session, session);
        queryClient.invalidateQueries({ queryKey: authKeys.profile(session.user.id) });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, resetAuth, queryClient]);

  return query;
}

// Re-export user profile hooks
export { useUserProfile, useUpdateProfileMutation, profileKeys } from "./use-profile";

export interface GoogleSignInOptions {
  redirectTo?: string;
  redirectUrl?: string;
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
      const target = options?.redirectUrl || options?.redirectTo || options?.next || "/home";
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
