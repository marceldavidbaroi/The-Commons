import type { DynamicFieldDefinition } from './tags';

export type ItemType = 'consumable' | 'asset';

export interface UserItem {
	id: number;
	user_id: number;
	name: string;
	description?: string | null;
	item_type: ItemType;
	category_id?: number | null;
	category_slug?: string | null;
	category_name?: string | null;
	category_color?: string | null;
	group_id?: number | null;
	group_slug?: string | null;
	group_name?: string | null;
	group_icon?: string | null;
	tag_ids?: number[];
	tag_slugs?: string[];
	tags?: Array<{ id?: number; slug?: string; name: string; color?: string | null }>;
	location_id?: number | null;
	location_name?: string | null;
	quantity?: number | null;
	unit_of_measure?: string | null;
	reorder_threshold?: number | null;
	expiration_date?: string | null;
	condition_status?: string | null;
	is_loaned?: boolean;
	loaned_to?: string | null;
	loaned_at?: string | null;
	metadata?: Record<string, any> | null;
	is_archived?: boolean;
	created_at?: string;
	updated_at?: string;
}
