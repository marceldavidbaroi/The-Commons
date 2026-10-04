/**
 * Types for Authentication, Member Whitelist & Access Control (RBAC) - Integer ID Model
 */

export type UserRole = 'admin' | 'member' | 'guest';
export type MemberStatus = 'active' | 'suspended' | 'revoked';

export interface ProfileRow {
	id: number;
	auth_user_id?: string;
	email: string;
	full_name: string | null;
	username: string | null;
	avatar_url: string | null;
	bio: string | null;
	role: UserRole;
	sort_preferences?: {
		default_sort_by?: string;
		default_sort_order?: 'asc' | 'desc';
		custom_order?: any[];
		pinned_items?: any[];
		filter_favorites_first?: boolean;
	};
	email_preferences?: {
		marketing?: boolean;
		transactional?: boolean;
		newsletter?: boolean;
		product_updates?: boolean;
		digest_frequency?: string;
	};
	display_settings: {
		theme?: 'vintage' | 'classic' | 'modern' | 'system';
		density?: 'comfortable' | 'compact';
		view_mode?: 'grid' | 'list';
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
