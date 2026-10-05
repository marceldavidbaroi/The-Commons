import type { DynamicFieldDefinition } from './tags';

export interface UserItem {
	id: number;
	user_id: number;
	name: string;
	description?: string | null;
	category_id?: number | null;
	category_slug?: string | null;
	category_name?: string | null;
	category_color?: string | null;
	group_id?: number | null;
	group_slug?: string | null;
	group_name?: string | null;
	group_icon?: string | null;
	tag_slug?: string | null;
	tag?: { id?: number; slug?: string; name: string; color?: string | null } | null;
	location_id?: number | null;
	location_name?: string | null;
	condition_status?: string | null;
	is_loaned?: boolean;
	loaned_to?: string | null;
	loaned_at?: string | null;
	metadata?: Record<string, any> | null;
	is_archived?: boolean;
	created_at?: string;
	updated_at?: string;
}
