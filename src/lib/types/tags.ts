export interface Tag {
	id: number | string;
	category_id: number | string;
	user_id?: string;
	name: string;
	color?: string | null;
	is_system?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface TagCategory {
	id: number | string;
	user_id?: string;
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
