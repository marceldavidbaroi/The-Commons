import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type { FolderRecord, NoteStub, NoteDetail, TrashedItem } from '$lib/types/notes';

function getClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client || getSupabaseClient();
}

/**
 * Fetch all active folders for the authenticated user.
 */
export async function fetchFolders(customClient?: SupabaseClient<Database>): Promise<FolderRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('folders')
    .select('id, parent_id, name, created_at, updated_at, deleted_at')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
  return data || [];
}

/**
 * Fetch all active note stubs (headers/metadata) for the authenticated user.
 */
export async function fetchNoteStubs(customClient?: SupabaseClient<Database>): Promise<NoteStub[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .select('id, folder_id, title, updated_at, deleted_at')
    .is('deleted_at', null)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching note stubs:', error);
    throw error;
  }
  return data || [];
}

/**
 * Fetch a single note's full details and content by UUID.
 */
export async function fetchNoteDetail(
  id: string,
  customClient?: SupabaseClient<Database>
): Promise<NoteDetail | null> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .select('id, folder_id, title, content, created_at, updated_at, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching note detail:', error);
    throw error;
  }
  return data;
}

/**
 * Create a new note. Returns the created record immediately.
 */
export async function createNote(
  payload: { title: string; content?: string; folder_id?: string | null },
  customClient?: SupabaseClient<Database>
): Promise<NoteDetail> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: payload.title,
      content: payload.content ?? '',
      folder_id: payload.folder_id ?? null
    })
    .select('id, folder_id, title, content, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw error;
  }
  return data;
}

/**
 * Update note content with debounced autosave.
 */
export async function updateNoteContent(
  id: string,
  content: string,
  customClient?: SupabaseClient<Database>
): Promise<NoteDetail> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, folder_id, title, content, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error updating note content:', error);
    throw error;
  }
  return data;
}

/**
 * Rename a note.
 */
export async function renameNote(
  id: string,
  title: string,
  customClient?: SupabaseClient<Database>
): Promise<NoteDetail> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, folder_id, title, content, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error renaming note:', error);
    throw error;
  }
  return data;
}

/**
 * Soft-delete a note.
 */
export async function deleteNote(
  id: string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error soft-deleting note:', error);
    throw error;
  }
}

/**
 * Move a note to a different folder (or root).
 */
export async function moveNote(
  id: string,
  folder_id: string | null,
  customClient?: SupabaseClient<Database>
): Promise<NoteDetail> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('notes')
    .update({ folder_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, folder_id, title, content, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error moving note:', error);
    throw error;
  }
  return data;
}

/**
 * Create a new folder.
 */
export async function createFolder(
  name: string,
  parent_id?: string | null,
  customClient?: SupabaseClient<Database>
): Promise<FolderRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('folders')
    .insert({
      name,
      parent_id: parent_id ?? null
    })
    .select('id, parent_id, name, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
  return data;
}

/**
 * Rename a folder.
 */
export async function renameFolder(
  id: string,
  name: string,
  customClient?: SupabaseClient<Database>
): Promise<FolderRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, parent_id, name, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    console.error('Error renaming folder:', error);
    throw error;
  }
  return data;
}

/**
 * Delete a folder via RPC (Option A: cascade children vs Option B: orphan children).
 */
export async function deleteFolder(
  target_folder_id: string,
  cascade_children: boolean,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase.rpc('delete_folder', {
    target_folder_id,
    cascade_children
  });

  if (error) {
    console.error('Error executing delete_folder RPC:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted note via RPC.
 */
export async function restoreNote(
  target_note_id: string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase.rpc('restore_note', {
    target_note_id
  });

  if (error) {
    console.error('Error executing restore_note RPC:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted folder via RPC.
 */
export async function restoreFolder(
  target_folder_id: string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase.rpc('restore_folder', {
    target_folder_id
  });

  if (error) {
    console.error('Error executing restore_folder RPC:', error);
    throw error;
  }
}

/**
 * Permanently purge an item from the database via RPC.
 */
export async function purgeItem(
  item_type: 'note' | 'folder',
  item_id: string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase.rpc('purge_item', {
    item_type,
    item_id
  });

  if (error) {
    console.error('Error executing purge_item RPC:', error);
    throw error;
  }
}

/**
 * Fetch all soft-deleted notes and folders for the recycle bin.
 */
export async function fetchRecycleBin(
  customClient?: SupabaseClient<Database>
): Promise<{ notes: NoteStub[]; folders: FolderRecord[] }> {
  const supabase = getClient(customClient);

  const [notesRes, foldersRes] = await Promise.all([
    supabase
      .from('notes')
      .select('id, folder_id, title, updated_at, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('folders')
      .select('id, parent_id, name, created_at, updated_at, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
  ]);

  if (notesRes.error) {
    console.error('Error fetching soft-deleted notes:', notesRes.error);
    throw notesRes.error;
  }
  if (foldersRes.error) {
    console.error('Error fetching soft-deleted folders:', foldersRes.error);
    throw foldersRes.error;
  }

  return {
    notes: notesRes.data || [],
    folders: foldersRes.data || []
  };
}

/**
 * Fetch connections / backlinks for a note or entire active graph.
 */
export async function fetchConnections(
  customClient?: SupabaseClient<Database>
): Promise<Array<{ id: string; source_note_id: string; target_note_id: string }>> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('note_connections')
    .select('id, source_note_id, target_note_id')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching note connections:', error);
    throw error;
  }
  return data || [];
}
