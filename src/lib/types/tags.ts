export function slugifyTag(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-_]/g, '')
		.replace(/[\s_]+/g, '-');
}

export interface Tag {
	id: number;
	category_id: number;
	slug: string;
	user_id?: number | null;
	name: string;
	color?: string | null;
	is_system?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface DynamicFieldDefinition {
	key: string;
	label: string;
	type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect';
	placeholder?: string;
	unit?: string;
	options?: string[];
	default?: unknown;
	required?: boolean;
	filterable?: boolean;
	sortable?: boolean;
	description?: string;
}

export interface TagGroup {
	id: number;
	slug: string;
	user_id?: number | null;
	feature: string;
	name: string;
	icon: string;
	color: string;
	display_order: number;
	is_system?: boolean;
	schema_blueprint?: DynamicFieldDefinition[] | any;
	created_at?: string;
	updated_at?: string;
	categories?: TagCategory[];
}

export interface TagCategory {
	id: number;
	slug: string;
	user_id?: number | null;
	feature: string;
	group_id?: number | null;
	name: string;
	color: string;
	display_order: number;
	is_system?: boolean;
	schema_blueprint?: DynamicFieldDefinition[] | any;
	created_at?: string;
	updated_at?: string;
	tags?: Tag[];
	tag_group?: TagGroup | null;
}

export type FeatureType = 'tasks' | 'goals' | 'diary' | 'document' | 'homeops' | 'general' | string;

