"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { authKeys } from "./use-auth";
import type { Profile, CitizenPassportMetrics, Json } from "@/types/database";

export const profileKeys = {
  all: ["profile"] as const,
  detail: (userId?: string) => ["profile", "detail", userId] as const,
  passportMetrics: (userId?: string) => ["profile", "passport-metrics", userId] as const,
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
 * Hook to retrieve calculated Citizen Passport Metrics via PostgreSQL RPC.
 */
export function useCitizenPassportMetrics(userId?: string) {
  return useQuery({
    queryKey: profileKeys.passportMetrics(userId),
    queryFn: async (): Promise<CitizenPassportMetrics | null> => {
      if (!userId) return null;
      const supabase = createClient();
      
      const { data, error } = await supabase.rpc("get_citizen_passport_metrics");

      if (error) {
        console.warn("RPC get_citizen_passport_metrics failed, falling back gracefully:", error.message);
        return null;
      }

      return data as unknown as CitizenPassportMetrics;
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
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

/**
 * Mutation hook to seal / update Citizen Passport credentials via the update_citizen_passport RPC.
 */
export function useUpdateCitizenPassportMutation() {
  const setProfile = useAuthStore((state) => state.setProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fullName?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      metadata?: Record<string, Json>;
    }) => {
      const supabase = createClient();

      const { data, error } = await (supabase.rpc as any)("update_citizen_passport", {
        p_full_name: params.fullName ?? null,
        p_username: params.username ?? null,
        p_bio: params.bio ?? null,
        p_avatar_url: params.avatarUrl ?? null,
        p_metadata: (params.metadata as any) ?? null,
      });

      if (error) {
        // Fallback to table update if RPC is missing in local environment
        console.warn("RPC update_citizen_passport error, falling back to direct table update:", error.message);
        const { data: fallbackData, error: fallbackError } = await (supabase.from("profiles") as any)
          .update({
            ...(params.fullName !== undefined ? { full_name: params.fullName } : {}),
            ...(params.username !== undefined ? { username: params.username } : {}),
            ...(params.bio !== undefined ? { bio: params.bio } : {}),
            ...(params.avatarUrl !== undefined ? { avatar_url: params.avatarUrl } : {}),
            ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        return fallbackData as Profile;
      }

      return data as unknown as Profile;
    },
    onSuccess: (updatedProfile) => {
      if (updatedProfile?.id) {
        setProfile(updatedProfile);
        queryClient.setQueryData(authKeys.profile(updatedProfile.id), updatedProfile);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
