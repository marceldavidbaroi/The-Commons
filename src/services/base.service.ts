import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@supabase/supabase-js";

export class ServiceError extends Error {
  public code?: string;
  public details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }
}

/**
 * BaseService provides reusable Supabase client instance management,
 * authentication helpers, and resilient error normalization.
 */
export abstract class BaseService {
  protected static getSupabase() {
    return createClient();
  }

  /**
   * Retrieves current authenticated Supabase user from Zustand store or local session,
   * avoiding redundant network calls to /auth/v1/user.
   */
  protected static async getAuthenticatedUser(required = true): Promise<User | null> {
    // 1. Check in-memory Zustand store (instant, 0 network requests)
    const storeUser = useAuthStore.getState().user;
    if (storeUser) {
      return storeUser;
    }

    // 2. Check local session storage (0 network requests)
    const supabase = this.getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      if (required) {
        throw new ServiceError("User is not authenticated", "UNAUTHENTICATED");
      }
      return null;
    }

    return user;
  }

  /**
   * Ensures a profile entry exists in public.profiles to satisfy Foreign Key constraints.
   */
  protected static async ensureProfile(userId: string, email?: string | null): Promise<void> {
    try {
      const supabase = this.getSupabase();
      await (supabase.from("profiles") as any).upsert(
        {
          id: userId,
          email: email || `${userId}@user.local`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch {
      // Non-blocking
    }
  }

  /**
   * Normalizes unknown database/network errors into structured ServiceErrors.
   */
  protected static handleError(error: unknown, fallbackMessage = "An unexpected error occurred"): never {
    if (error instanceof ServiceError) {
      throw error;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
      const errObj = error as { message: string; code?: string; details?: unknown };
      throw new ServiceError(errObj.message || fallbackMessage, errObj.code, errObj.details);
    }

    throw new ServiceError(fallbackMessage, "UNKNOWN_ERROR", error);
  }
}
