/**
 * Stub definitions for Authentication & Access Control (RBAC)
 */

export type UserRole = "admin" | "member" | "guest";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  display_settings: {
    theme?: "vintage" | "classic" | "modern" | "system";
    density?: "comfortable" | "compact";
    view_mode?: "grid" | "list";
  };
  metadata: {
    clearance_title?: string;
    residence?: string;
    ritual_streak_days?: number;
    unlocked_stamps?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface AuthUIState {
  isAuthModalOpen: boolean;
  authError: string | null;
  setAuthModalOpen: (isOpen: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearError: () => void;
}

export declare function signInWithGoogle(): Promise<{ error: Error | null }>;
export declare function signInWithEmailOtp(email: string): Promise<{ error: Error | null }>;
export declare function signOutMember(): Promise<{ error: Error | null }>;
export declare function fetchUserProfile(userId: string): Promise<ProfileRow | null>;
export declare function checkUserRole(userId: string): Promise<UserRole>;
