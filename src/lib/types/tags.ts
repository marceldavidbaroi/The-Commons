export interface Tag {
	id: number;
	category_id: number;
	user_id?: number | null;
	name: string;
	color?: string | null;
	is_system?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface TagCategory {
	id: number;
	user_id?: number | null;
	feature: string;
	name: string;
	color: string;
	display_order: number;
	is_system?: boolean;
	created_at?: string;
	updated_at?: string;
	tags?: Tag[];
}

export type FeatureType = 'tasks' | 'goals' | 'diary' | 'document' | 'general' | string;
