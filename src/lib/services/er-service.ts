import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '$lib/supabase';
import type { Database } from '$lib/types/database.types';
import type {
	CreateErDiagramPayload,
	CreateErGroupPayload,
	CreateErNotePayload,
	CreateErTablePayload,
	ErCursor,
	ErDiagram,
	ErGroup,
	ErGroupTableCount,
	ErNote,
	ErPaginatedResult,
	ErTable,
	PublicSchemaMetadata,
	UpdateErDiagramPayload,
	UpdateErGroupPayload,
	UpdateErNotePayload,
	UpdateErTablePayload
} from '$lib/types/er';

export const ER_PAGE_SIZE = 20;

const DIAGRAM_COLS = 'id, user_id, name, source_type, created_at, updated_at';
const GROUP_COLS = 'id, diagram_id, user_id, name, color, position, created_at';
const TABLE_COLS =
	'id, diagram_id, group_id, user_id, name, columns, relations, position, created_at, updated_at';
const NOTE_COLS =
	'id, diagram_id, user_id, target_type, target_id, content, position, created_at, updated_at';
const GROUP_COUNT_COLS = 'diagram_id, group_id, table_count';

function getClient(customClient?: SupabaseClient<Database>): any {
	return customClient ?? getSupabaseClient();
}

function applyCreatedAtCursor<T extends { or: (filter: string) => T }>(
	query: T,
	cursor?: ErCursor | null
): T {
	if (!cursor) return query;
	return query.or(
		`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
	);
}

function buildPaginatedResult<T extends { created_at: string; id: string }>(
	rows: T[]
): ErPaginatedResult<T> {
	const hasMore = rows.length > ER_PAGE_SIZE;
	const items = hasMore ? rows.slice(0, ER_PAGE_SIZE) : rows;
	const last = items[items.length - 1];
	const nextCursor: ErCursor | null =
		hasMore && last ? { created_at: last.created_at, id: last.id } : null;
	return { items, hasMore, nextCursor };
}

// --- Diagrams ---

export async function fetchDiagrams(
	cursor?: ErCursor | null,
	customClient?: SupabaseClient<Database>
): Promise<ErPaginatedResult<ErDiagram>> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('er_diagrams')
		.select(DIAGRAM_COLS)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(ER_PAGE_SIZE + 1);

	query = applyCreatedAtCursor(query, cursor);

	const { data, error } = await query;
	if (error) throw error;
	return buildPaginatedResult((data as ErDiagram[]) ?? []);
}

export async function createDiagram(
	payload: CreateErDiagramPayload,
	customClient?: SupabaseClient<Database>
): Promise<ErDiagram> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_diagrams')
		.insert({
			name: payload.name,
			source_type: payload.source_type ?? 'ddl'
		})
		.select(DIAGRAM_COLS)
		.single();

	if (error) throw error;
	return data as ErDiagram;
}

export async function updateDiagram(
	id: string,
	payload: UpdateErDiagramPayload,
	customClient?: SupabaseClient<Database>
): Promise<ErDiagram> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_diagrams')
		.update(payload)
		.eq('id', id)
		.select(DIAGRAM_COLS)
		.single();

	if (error) throw error;
	return data as ErDiagram;
}

export async function deleteDiagram(
	id: string,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient);
	const { error } = await supabase.from('er_diagrams').delete().eq('id', id);
	if (error) throw error;
}

// --- Groups & Server Counts ---

export async function fetchGroups(
	diagramId: string,
	cursor?: ErCursor | null,
	customClient?: SupabaseClient<Database>
): Promise<ErPaginatedResult<ErGroup>> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('er_groups')
		.select(GROUP_COLS)
		.eq('diagram_id', diagramId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(ER_PAGE_SIZE + 1);

	query = applyCreatedAtCursor(query, cursor);

	const { data, error } = await query;
	if (error) throw error;
	return buildPaginatedResult((data as ErGroup[]) ?? []);
}

export async function fetchGroupTableCounts(
	diagramId: string,
	customClient?: SupabaseClient<Database>
): Promise<ErGroupTableCount[]> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_group_table_counts')
		.select(GROUP_COUNT_COLS)
		.eq('diagram_id', diagramId);

	if (error) throw error;
	return (data as ErGroupTableCount[]) ?? [];
}

export async function createGroup(
	payload: CreateErGroupPayload,
	customClient?: SupabaseClient<Database>
): Promise<ErGroup> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_groups')
		.insert({
			diagram_id: payload.diagram_id,
			name: payload.name,
			color: payload.color ?? 'slate',
			position: payload.position ?? { x: 0, y: 0, width: 480, height: 360 }
		})
		.select(GROUP_COLS)
		.single();

	if (error) throw error;
	return data as ErGroup;
}

export async function updateGroup(
	id: string,
	payload: UpdateErGroupPayload,
	customClient?: SupabaseClient<Database>
): Promise<ErGroup> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_groups')
		.update(payload)
		.eq('id', id)
		.select(GROUP_COLS)
		.single();

	if (error) throw error;
	return data as ErGroup;
}

export async function deleteGroup(
	id: string,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient);
	const { error } = await supabase.from('er_groups').delete().eq('id', id);
	if (error) throw error;
}

// --- Tables (Group-Scoped Lazy Loading) ---

export async function fetchTablesByGroup(
	diagramId: string,
	groupId: string | null,
	cursor?: ErCursor | null,
	customClient?: SupabaseClient<Database>
): Promise<ErPaginatedResult<ErTable>> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('er_tables')
		.select(TABLE_COLS)
		.eq('diagram_id', diagramId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(ER_PAGE_SIZE + 1);

	query = groupId === null ? query.is('group_id', null) : query.eq('group_id', groupId);
	query = applyCreatedAtCursor(query, cursor);

	const { data, error } = await query;
	if (error) throw error;
	return buildPaginatedResult((data as ErTable[]) ?? []);
}

export async function createTable(
	payload: CreateErTablePayload,
	customClient?: SupabaseClient<Database>
): Promise<ErTable> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_tables')
		.insert({
			diagram_id: payload.diagram_id,
			group_id: payload.group_id ?? null,
			name: payload.name,
			columns: payload.columns,
			relations: payload.relations ?? [],
			position: payload.position ?? { x: 0, y: 0 }
		})
		.select(TABLE_COLS)
		.single();

	if (error) throw error;
	return data as ErTable;
}

export async function createTablesBulk(
	payloads: CreateErTablePayload[],
	customClient?: SupabaseClient<Database>
): Promise<ErTable[]> {
	if (payloads.length === 0) return [];
	const supabase = getClient(customClient);
	const rows = payloads.map((p) => ({
		diagram_id: p.diagram_id,
		group_id: p.group_id ?? null,
		name: p.name,
		columns: p.columns,
		relations: p.relations ?? [],
		position: p.position ?? { x: 0, y: 0 }
	}));

	const { data, error } = await supabase.from('er_tables').insert(rows).select(TABLE_COLS);
	if (error) throw error;
	return (data as ErTable[]) ?? [];
}

export async function updateTable(
	id: string,
	payload: UpdateErTablePayload,
	customClient?: SupabaseClient<Database>
): Promise<ErTable> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_tables')
		.update(payload)
		.eq('id', id)
		.select(TABLE_COLS)
		.single();

	if (error) throw error;
	return data as ErTable;
}

export async function deleteTable(
	id: string,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient);
	const { error } = await supabase.from('er_tables').delete().eq('id', id);
	if (error) throw error;
}

// --- Study Notes ---

export async function fetchNotes(
	diagramId: string,
	cursor?: ErCursor | null,
	customClient?: SupabaseClient<Database>
): Promise<ErPaginatedResult<ErNote>> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('er_notes')
		.select(NOTE_COLS)
		.eq('diagram_id', diagramId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(ER_PAGE_SIZE + 1);

	query = applyCreatedAtCursor(query, cursor);

	const { data, error } = await query;
	if (error) throw error;
	return buildPaginatedResult((data as ErNote[]) ?? []);
}

export async function createNote(
	payload: CreateErNotePayload,
	customClient?: SupabaseClient<Database>
): Promise<ErNote> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_notes')
		.insert({
			diagram_id: payload.diagram_id,
			target_type: payload.target_type,
			target_id: payload.target_id,
			content: payload.content,
			position: payload.position ?? null
		})
		.select(NOTE_COLS)
		.single();

	if (error) throw error;
	return data as ErNote;
}

export async function updateNote(
	id: string,
	payload: UpdateErNotePayload,
	customClient?: SupabaseClient<Database>
): Promise<ErNote> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('er_notes')
		.update(payload)
		.eq('id', id)
		.select(NOTE_COLS)
		.single();

	if (error) throw error;
	return data as ErNote;
}

export async function deleteNote(
	id: string,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient);
	const { error } = await supabase.from('er_notes').delete().eq('id', id);
	if (error) throw error;
}

// --- Live Public Schema Introspection ---

export async function fetchPublicSchemaMetadata(
	customClient?: SupabaseClient<Database>
): Promise<PublicSchemaMetadata> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase.rpc('get_public_schema_metadata');
	if (error) throw error;
	return (data as PublicSchemaMetadata) ?? { tables: [], relations: [] };
}
