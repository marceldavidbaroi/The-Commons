/**
 * Stub definitions for Authentication, Member Whitelist & Access Control (RBAC) - Integer ID Model
 */

export type UserRole = "admin" | "member" | "guest";
export type MemberStatus = "active" | "suspended" | "revoked";

export interface ProfileRow {
  id: number;
  auth_user_id?: string;
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

export interface AllowedMemberRow {
  id: number;
  email: string;
  added_by: number | null;
  status: MemberStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddMemberPayload {
  email: string;
  notes?: string;
}

// Client Authentication Stubs
export declare function signInWithGoogleMember(): Promise<{ error: Error | null }>;
export declare function signInWithGoogleAdmin(): Promise<{ error: Error | null }>;
export declare function signOut(): Promise<{ error: Error | null }>;
export declare function fetchUserProfile(userId: number): Promise<ProfileRow | null>;
export declare function checkIsWhitelisted(email: string): Promise<boolean>;

// Admin Management Stubs
export declare function listAllowedMembers(): Promise<{ data: AllowedMemberRow[] | null; error: Error | null }>;
export declare function addAllowedMember(payload: AddMemberPayload): Promise<{ data: AllowedMemberRow | null; error: Error | null }>;
export declare function revokeAllowedMember(id: number): Promise<{ error: Error | null }>;
