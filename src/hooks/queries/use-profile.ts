"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { authKeys } from "./use-auth";
import type { Profile } from "@/types/database";

export const profileKeys = {
  all: ["profile"] as const,
  detail: (userId?: string) => ["profile", "detail", userId] as const,
};

/**
 * Hook to retrieve User Profile and preferences from Supabase.
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

/**
 * Mutation hook for updating User Profile in Supabase and synchronizing Zustand store.
 */
export function useUpdateProfileMutation() {
  const setProfile = useAuthStore((state) => state.setProfile);
  const authUser = useAuthStore((state) => state.user);
  const currentProfile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const supabase = createClient();
      const userId = updates.id || authUser?.id || currentProfile?.id;
      if (!userId) {
        throw new Error("No active user session found to update profile.");
      }

      const { id: _, created_at: __, ...updatePayload } = updates;

      const { data, error } = await (supabase.from("profiles") as any)
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.setQueryData(authKeys.profile(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
