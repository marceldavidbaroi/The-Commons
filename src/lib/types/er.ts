export type ErSourceType = 'live' | 'ddl' | 'manual';

export type ErNoteTargetType = 'canvas' | 'group' | 'table';

export interface ErPosition {
	x: number;
	y: number;
}

export interface ErGroupPosition extends ErPosition {
	width: number;
	height: number;
}

export interface ErColumnFkTarget {
	table: string;
	column: string;
}

export interface ErColumn {
	name: string;
	type: string;
	nullable?: boolean;
	is_pk?: boolean;
	fk_target?: ErColumnFkTarget | null;
}

export interface ErRelation {
	from_column: string;
	to_table: string;
	to_column: string;
}

export interface ErDiagram {
	id: string;
	user_id: string;
	name: string;
	source_type: ErSourceType;
	created_at: string;
	updated_at: string;
}

export interface ErGroup {
	id: string;
	diagram_id: string;
	user_id: string;
	name: string;
	color: string;
	position: ErGroupPosition;
	created_at: string;
}

export interface ErTable {
	id: string;
	diagram_id: string;
	group_id: string | null;
	user_id: string;
	name: string;
	columns: ErColumn[];
	relations: ErRelation[];
	position: ErPosition;
	created_at: string;
	updated_at: string;
}

export interface ErNote {
	id: string;
	diagram_id: string;
	user_id: string;
	target_type: ErNoteTargetType;
	target_id: string;
	content: string;
	position: ErPosition | null;
	created_at: string;
	updated_at: string;
}

export interface ErGroupTableCount {
	diagram_id: string;
	group_id: string | null;
	table_count: number;
}

export interface ErCursor {
	created_at: string;
	id: string;
}

export interface ErPaginatedResult<T> {
	items: T[];
	hasMore: boolean;
	nextCursor: ErCursor | null;
}

export interface CreateErDiagramPayload {
	name: string;
	source_type?: ErSourceType;
}

export interface UpdateErDiagramPayload {
	name?: string;
	source_type?: ErSourceType;
}

export interface CreateErGroupPayload {
	diagram_id: string;
	name: string;
	color?: string;
	position?: ErGroupPosition;
}

export interface UpdateErGroupPayload {
	name?: string;
	color?: string;
	position?: ErGroupPosition;
}

export interface CreateErTablePayload {
	diagram_id: string;
	group_id?: string | null;
	name: string;
	columns: ErColumn[];
	relations?: ErRelation[];
	position?: ErPosition;
}

export interface UpdateErTablePayload {
	group_id?: string | null;
	name?: string;
	columns?: ErColumn[];
	relations?: ErRelation[];
	position?: ErPosition;
}

export interface CreateErNotePayload {
	diagram_id: string;
	target_type: ErNoteTargetType;
	target_id: string;
	content: string;
	position?: ErPosition | null;
}

export interface UpdateErNotePayload {
	content?: string;
	position?: ErPosition | null;
}

export interface PublicSchemaColumn {
	name: string;
	type: string;
	nullable: boolean;
}

export interface PublicSchemaTable {
	name: string;
	columns: PublicSchemaColumn[];
}

export interface PublicSchemaRelation {
	from_table: string;
	from_column: string;
	to_table: string;
	to_column: string;
}

export interface PublicSchemaMetadata {
	tables: PublicSchemaTable[];
	relations: PublicSchemaRelation[];
}
