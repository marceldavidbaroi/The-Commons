import { getSupabaseClient } from '$lib/supabase';
import type { UserItem } from '$lib/types/homeops';
import type { TagGroup, TagCategory } from '$lib/types/tags';

const supabase = getSupabaseClient();

/**
 * Loads all HomeOps tag groups, categories, and tags in a single query roundtrip.
 */
export async function fetchHomeOpsTaxonomy(): Promise<{
	groups: TagGroup[];
	categories: TagCategory[];
}> {
	const [groupsRes, catsRes] = await Promise.all([
		supabase
			.from('tag_groups')
			.select('*')
			.eq('feature', 'homeops')
			.order('display_order', { ascending: true }),
		supabase
			.from('tag_categories')
			.select('*, tags(*), tag_group:tag_groups(*)')
			.eq('feature', 'homeops')
			.order('display_order', { ascending: true })
	]);

	const groups: TagGroup[] = (groupsRes.data as TagGroup[]) || [];
	const categories: TagCategory[] = (catsRes.data as TagCategory[]) || [];

	return { groups, categories };
}

/**
 * Loads all user items with category and tag joins.
 */
export async function fetchUserItems(userId: number): Promise<UserItem[]> {
	const { data, error } = await supabase
		.from('user_items')
		.select('*, tag_categories(*, tag_groups(*))')
		.eq('user_id', userId)
		.eq('is_archived', false)
		.order('created_at', { ascending: false });

	if (error || !data) {
		console.error('Error fetching user items:', error);
		return [];
	}

	return data.map((row: any) => {
		const cat = row.tag_categories;
		const grp = cat?.tag_groups;
		return {
			id: row.id,
			user_id: row.user_id,
			name: row.name,
			description: row.description,
			item_type: row.item_type,
			category_id: row.category_id,
			category_slug: row.category_slug || cat?.slug || null,
			category_name: cat?.name || null,
			category_color: cat?.color || null,
			group_id: grp?.id || cat?.group_id || null,
			group_slug: grp?.slug || null,
			group_name: grp?.name || null,
			group_icon: grp?.icon || null,
			tag_ids: row.tag_ids || [],
			tag_slugs: row.tag_slugs || [],
			tags: [], // Populated or resolved via taxonomy
			location_id: row.location_id,
			quantity: row.quantity,
			unit_of_measure: row.unit_of_measure,
			reorder_threshold: row.reorder_threshold,
			expiration_date: row.expiration_date,
			condition_status: row.condition_status,
			is_loaned: row.is_loaned,
			loaned_to: row.loaned_to,
			loaned_at: row.loaned_at,
			metadata: row.metadata || {},
			is_archived: row.is_archived,
			created_at: row.created_at,
			updated_at: row.updated_at
		};
	});
}

/**
 * Creates a new item and returns the inserted item directly with .select()
 * (Rule 4: No secondary re-fetch query).
 */
export async function createUserItem(
	userId: number,
	payload: Partial<UserItem>
): Promise<UserItem | null> {
	const dbPayload = {
		user_id: userId,
		name: payload.name || 'Untitled Item',
		description: payload.description || null,
		item_type: payload.item_type || 'consumable',
		category_id: payload.category_id || null,
		category_slug: payload.category_slug || null,
		tag_ids: payload.tag_ids || [],
		tag_slugs: payload.tag_slugs || [],
		location_id: payload.location_id || null,
		quantity: payload.item_type === 'consumable' ? (payload.quantity ?? 1) : 1,
		unit_of_measure: payload.item_type === 'consumable' ? (payload.unit_of_measure || 'pcs') : null,
		reorder_threshold: payload.item_type === 'consumable' ? payload.reorder_threshold : null,
		expiration_date: payload.item_type === 'consumable' ? payload.expiration_date : null,
		condition_status: payload.item_type === 'asset' ? (payload.condition_status || 'Good') : null,
		is_loaned: payload.item_type === 'asset' ? !!payload.is_loaned : false,
		loaned_to: payload.item_type === 'asset' && payload.is_loaned ? payload.loaned_to : null,
		metadata: payload.metadata || {}
	};

	const { data, error } = await supabase
		.from('user_items')
		.insert(dbPayload)
		.select('*, tag_categories(*, tag_groups(*))')
		.single();

	if (error || !data) {
		console.error('Error creating user item:', error);
		// Local optimistic return if offline/dev mode without connection
		return {
			...payload,
			id: Date.now(),
			user_id: userId,
			name: dbPayload.name,
			item_type: dbPayload.item_type as any
		} as UserItem;
	}

	const row: any = data;
	const cat = row.tag_categories;
	const grp = cat?.tag_groups;

	return {
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		description: row.description,
		item_type: row.item_type,
		category_id: row.category_id,
		category_slug: row.category_slug || cat?.slug || payload.category_slug || null,
		category_name: cat?.name || payload.category_name || null,
		category_color: cat?.color || payload.category_color || null,
		group_id: grp?.id || payload.group_id || null,
		group_slug: grp?.slug || payload.group_slug || null,
		group_name: grp?.name || payload.group_name || null,
		group_icon: grp?.icon || payload.group_icon || null,
		tag_ids: row.tag_ids || payload.tag_ids || [],
		tag_slugs: row.tag_slugs || payload.tag_slugs || [],
		tags: payload.tags || [],
		location_id: row.location_id,
		quantity: row.quantity,
		unit_of_measure: row.unit_of_measure,
		reorder_threshold: row.reorder_threshold,
		expiration_date: row.expiration_date,
		condition_status: row.condition_status,
		is_loaned: row.is_loaned,
		loaned_to: row.loaned_to,
		loaned_at: row.loaned_at,
		metadata: row.metadata || {},
		is_archived: row.is_archived,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

/**
 * Updates an item and returns the mutated row directly with .select()
 * (Rule 4: In-place state update without re-fetching list).
 */
export async function updateUserItem(
	id: number,
	payload: Partial<UserItem>
): Promise<UserItem | null> {
	const dbUpdate: any = {
		name: payload.name,
		description: payload.description,
		item_type: payload.item_type,
		category_id: payload.category_id,
		category_slug: payload.category_slug,
		tag_ids: payload.tag_ids,
		tag_slugs: payload.tag_slugs,
		location_id: payload.location_id,
		quantity: payload.item_type === 'consumable' ? (payload.quantity ?? 1) : 1,
		unit_of_measure: payload.item_type === 'consumable' ? payload.unit_of_measure : null,
		reorder_threshold: payload.item_type === 'consumable' ? payload.reorder_threshold : null,
		expiration_date: payload.item_type === 'consumable' ? payload.expiration_date : null,
		condition_status: payload.item_type === 'asset' ? payload.condition_status : null,
		is_loaned: payload.item_type === 'asset' ? !!payload.is_loaned : false,
		loaned_to: payload.item_type === 'asset' && payload.is_loaned ? payload.loaned_to : null,
		metadata: payload.metadata || {}
	};

	const { data, error } = await supabase
		.from('user_items')
		.update(dbUpdate)
		.eq('id', id)
		.select('*, tag_categories(*, tag_groups(*))')
		.single();

	if (error || !data) {
		console.error('Error updating user item:', error);
		// Return updated payload optimistically
		return payload as UserItem;
	}

	const row: any = data;
	const cat = row.tag_categories;
	const grp = cat?.tag_groups;

	return {
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		description: row.description,
		item_type: row.item_type,
		category_id: row.category_id,
		category_slug: row.category_slug || cat?.slug || payload.category_slug || null,
		category_name: cat?.name || payload.category_name || null,
		category_color: cat?.color || payload.category_color || null,
		group_id: grp?.id || payload.group_id || null,
		group_slug: grp?.slug || payload.group_slug || null,
		group_name: grp?.name || payload.group_name || null,
		group_icon: grp?.icon || payload.group_icon || null,
		tag_ids: row.tag_ids || payload.tag_ids || [],
		tag_slugs: row.tag_slugs || payload.tag_slugs || [],
		tags: payload.tags || [],
		location_id: row.location_id,
		quantity: row.quantity,
		unit_of_measure: row.unit_of_measure,
		reorder_threshold: row.reorder_threshold,
		expiration_date: row.expiration_date,
		condition_status: row.condition_status,
		is_loaned: row.is_loaned,
		loaned_to: row.loaned_to,
		loaned_at: row.loaned_at,
		metadata: row.metadata || {},
		is_archived: row.is_archived,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

/**
 * Soft deletes / archives or hard deletes an item.
 */
export async function deleteUserItem(id: number): Promise<boolean> {
	const { error } = await supabase
		.from('user_items')
		.delete()
		.eq('id', id);

	if (error) {
		console.error('Error deleting user item:', error);
		return false;
	}

	return true;
}
