import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
	QuickNote,
	CreateQuickNotePayload,
	UpdateQuickNotePayload,
	QuickNoteCursor,
	TrashedQuickNoteCursor
} from '$lib/types/quick-note';

const QUICK_NOTE_COLUMNS =
	'id, title, content, preview, is_pinned, is_locked, created_at, updated_at, deleted_at';
const PAGE_SIZE = 20;

function getClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
	return client || getSupabaseClient();
}

async function hashPasscode(passcode: string): Promise<string> {
	const data = new TextEncoder().encode(passcode);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function fetchQuickNotes(
	cursor?: QuickNoteCursor,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote[]> {
	const supabase = getClient(customClient) as any;
	let query = supabase
		.from('quick_notes')
		.select(QUICK_NOTE_COLUMNS)
		.is('deleted_at', null)
		.order('is_pinned', { ascending: false })
		.order('updated_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(PAGE_SIZE);

	if (cursor) {
		query = query.or(
			`is_pinned.lt.${cursor.is_pinned},and(is_pinned.eq.${cursor.is_pinned},updated_at.lt.${cursor.updated_at}),and(is_pinned.eq.${cursor.is_pinned},updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) throw error;
	return (data as QuickNote[]) || [];
}

export async function fetchTrashedQuickNotes(
	cursor?: TrashedQuickNoteCursor,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote[]> {
	const supabase = getClient(customClient) as any;
	let query = supabase
		.from('quick_notes')
		.select(QUICK_NOTE_COLUMNS)
		.not('deleted_at', 'is', null)
		.order('deleted_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(PAGE_SIZE);

	if (cursor) {
		query = query.or(
			`deleted_at.lt.${cursor.deleted_at},and(deleted_at.eq.${cursor.deleted_at},id.lt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) throw error;
	return (data as QuickNote[]) || [];
}

export async function fetchQuickNoteById(
	id: number,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote | null> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_notes')
		.select(QUICK_NOTE_COLUMNS)
		.eq('id', id)
		.maybeSingle();

	if (error) throw error;
	return (data as QuickNote) || null;
}

export async function createQuickNote(
	payload: CreateQuickNotePayload = {},
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_notes')
		.insert({
			title: payload.title ?? '',
			content: payload.content ?? '',
			preview: payload.preview ?? '',
			is_pinned: payload.is_pinned ?? false,
			is_locked: payload.is_locked ?? false
		})
		.select(QUICK_NOTE_COLUMNS)
		.single();

	if (error) throw error;
	return data as QuickNote;
}

export async function duplicateQuickNote(
	source: QuickNote,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	return createQuickNote(
		{
			title: source.title ? `${source.title} (Copy)` : '',
			content: source.content,
			preview: source.preview,
			is_pinned: false,
			is_locked: false
		},
		customClient
	);
}

export async function updateQuickNote(
	id: number,
	payload: UpdateQuickNotePayload,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_notes')
		.update({
			...payload,
			updated_at: payload.updated_at ?? new Date().toISOString()
		})
		.eq('id', id)
		.select(QUICK_NOTE_COLUMNS)
		.single();

	if (error) throw error;
	return data as QuickNote;
}

export async function togglePinQuickNote(
	id: number,
	is_pinned: boolean,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	return updateQuickNote(id, { is_pinned }, customClient);
}

export async function toggleLockQuickNote(
	id: number,
	is_locked: boolean,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	return updateQuickNote(id, { is_locked }, customClient);
}

export async function hasQuickNotePasscode(
	customClient?: SupabaseClient<Database>
): Promise<boolean> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_note_settings')
		.select('user_id')
		.maybeSingle();

	if (error) throw error;
	return Boolean(data);
}

export async function setQuickNotePasscode(
	passcode: string,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient) as any;
	const passcode_hash = await hashPasscode(passcode);
	const { error } = await supabase.from('quick_note_settings').upsert(
		{
			passcode_hash,
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'user_id' }
	);

	if (error) throw error;
}

export async function verifyQuickNotePasscode(
	passcode: string,
	customClient?: SupabaseClient<Database>
): Promise<boolean> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_note_settings')
		.select('passcode_hash')
		.maybeSingle();

	if (error) throw error;
	if (!data?.passcode_hash) return false;
	const candidateHash = await hashPasscode(passcode);
	return candidateHash === data.passcode_hash;
}

export async function softDeleteQuickNote(
	id: number,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_notes')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', id)
		.select(QUICK_NOTE_COLUMNS)
		.single();

	if (error) throw error;
	return data as QuickNote;
}

export async function restoreQuickNote(
	id: number,
	customClient?: SupabaseClient<Database>
): Promise<QuickNote> {
	const supabase = getClient(customClient) as any;
	const { data, error } = await supabase
		.from('quick_notes')
		.update({ deleted_at: null })
		.eq('id', id)
		.select(QUICK_NOTE_COLUMNS)
		.single();

	if (error) throw error;
	return data as QuickNote;
}

export async function hardDeleteQuickNote(
	id: number,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient) as any;
	const { error } = await supabase.from('quick_notes').delete().eq('id', id);

	if (error) throw error;
}
