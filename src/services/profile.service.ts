import { BaseService } from "./base.service";
import type { Profile, CitizenPassportMetrics } from "@/types/database";

export interface UpdateCitizenPassportInput {
  fullName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
}

export class ProfileService extends BaseService {
  /**
   * Fetches user profile by ID.
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      if (!userId) return null;
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  }

  /**
   * Fetches Citizen Passport metrics via RPC.
   */
  static async getCitizenPassportMetrics(userId?: string): Promise<CitizenPassportMetrics | null> {
    try {
      if (!userId) return null;
      const supabase = this.getSupabase();
      const { data, error } = await supabase.rpc("get_citizen_passport_metrics");

      if (error) {
        return null;
      }
      return data as unknown as CitizenPassportMetrics;
    } catch {
      return null;
    }
  }

  /**
   * Updates user profile in Supabase.
   */
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      const supabase = this.getSupabase();
      const { id: _, created_at: __, ...updatePayload } = updates;

      const { data, error } = await (supabase.from("profiles") as any)
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to update profile.");
      }

      return data as Profile;
    } catch (error) {
      return this.handleError(error, "Failed to update profile.");
    }
  }

  /**
   * Updates citizen passport credentials via RPC or direct update fallback.
   */
  static async updateCitizenPassport(input: UpdateCitizenPassportInput): Promise<Profile> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      const supabase = this.getSupabase();

      // 1. Try atomic RPC
      try {
        const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
          "update_citizen_passport",
          {
            p_full_name: input.fullName ?? null,
            p_username: input.username ?? null,
            p_bio: input.bio ?? null,
            p_avatar_url: input.avatarUrl ?? null,
            p_metadata: input.metadata ?? null,
          }
        );

        if (!rpcError && rpcData) {
          return rpcData as Profile;
        }
      } catch {
        // Fallback
      }

      // 2. Direct table update fallback
      const dbPayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.fullName !== undefined) dbPayload.full_name = input.fullName;
      if (input.username !== undefined) dbPayload.username = input.username;
      if (input.bio !== undefined) dbPayload.bio = input.bio;
      if (input.avatarUrl !== undefined) dbPayload.avatar_url = input.avatarUrl;
      if (input.metadata !== undefined) dbPayload.metadata = input.metadata;

      const { data, error } = await (supabase.from("profiles") as any)
        .update(dbPayload)
        .eq("id", user.id)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to update citizen passport.");
      }

      return data as Profile;
    } catch (error) {
      return this.handleError(error, "Failed to update citizen passport.");
    }
  }
}
