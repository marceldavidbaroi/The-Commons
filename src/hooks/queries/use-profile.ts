"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { ProfileService, UpdateCitizenPassportInput } from "@/services/profile.service";
import { notify } from "@/lib/notify";
import { authKeys } from "./use-auth";
import type { Profile, CitizenPassportMetrics } from "@/types/database";

export const profileKeys = {
  all: ["profile"] as const,
  detail: (userId?: string) => ["profile", "detail", userId] as const,
  passportMetrics: (userId?: string) => ["profile", "passport-metrics", userId] as const,
};

/**
 * Hook to retrieve User Profile from Supabase via ProfileService.
 */
export function useUserProfile(userId?: string) {
  const setProfile = useAuthStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      return ProfileService.getProfile(userId);
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
 * Hook to retrieve calculated Citizen Passport Metrics via ProfileService.
 */
export function useCitizenPassportMetrics(userId?: string) {
  return useQuery({
    queryKey: profileKeys.passportMetrics(userId),
    queryFn: async (): Promise<CitizenPassportMetrics | null> => {
      return ProfileService.getCitizenPassportMetrics(userId);
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
      const userId = updates.id || authUser?.id || currentProfile?.id;
      if (!userId) {
        throw new Error("No active user session found to update profile.");
      }
      return ProfileService.updateProfile(userId, updates);
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.setQueryData(authKeys.profile(data.id), data);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      notify.success("Profile Synchronized", "Your citizen preferences have been saved.");
    },
    onError: (error) => {
      notify.error(error, "Failed to update citizen profile.");
    },
  });
}

/**
 * Mutation hook for sealing and updating Citizen Passport credentials via RPC.
 */
export function useUpdateCitizenPassportMutation() {
  const setProfile = useAuthStore((state) => state.setProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCitizenPassportInput) => {
      return ProfileService.updateCitizenPassport(input);
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.setQueryData(authKeys.profile(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.passportMetrics(updatedProfile.id) });

      notify.success(
        "Credentials Sealed",
        "Your official citizen passport credentials and seals were updated."
      );
    },
    onError: (error) => {
      notify.error(error, "Failed to seal citizen credentials.");
    },
  });
}
