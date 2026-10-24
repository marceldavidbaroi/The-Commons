import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import fs from 'node:fs';
import path from 'node:path';

// Helper to load env vars
function loadEnv() {
  const envFiles = ['.env.local', '.env.local.prod', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1).trim();
          }
          if (val.length > 0 && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_TEST_URL || process.env.PUBLIC_SUPABASE_URL || 'https://rbnbgyytxgkkcrmkgnro.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibmJneXl0eGdra2NybWtnbnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Njc4NjgsImV4cCI6MjEwNTE0Mzg2OH0.3VGwo91QH7aBPxoA8ibDebk1YB9UfGeL-8hLl5gK064';

describe('Obsidian Folder Hierarchy & Soft-Delete Engine (TC-01 through TC-06)', () => {
  let adminClient: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let testUserId: string;
  const testUserEmail = `test_notes_suite_${Date.now()}@thecommons-test.internal`;
  const testUserPassword = 'TestPassword123!#';

  beforeAll(async () => {
    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

    // Create an isolated auth test user
    const { data: userRecord, error: createErr } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true
    });

    if (createErr || !userRecord?.user) {
      throw new Error(`Failed to create test user: ${createErr?.message}`);
    }

    testUserId = userRecord.user.id;

    // Sign in as user to test authenticated client calls with RLS
    userClient = createClient<Database>(supabaseUrl, anonKey);
    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword
    });

    if (signInErr) {
      throw new Error(`Failed to sign in test user: ${signInErr.message}`);
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  beforeEach(async () => {
    // Reset database state for test user
    await adminClient.from('note_connections').delete().eq('user_id', testUserId);
    await adminClient.from('notes').delete().eq('user_id', testUserId);
    await adminClient.from('folders').delete().eq('user_id', testUserId);
  });

  it('TC-01: Soft-deletes parent folder only and orphans children (cascade_children = false)', async () => {
    // 1. Arrange: Parent folder with child folder and note
    const { data: parent, error: pErr } = await userClient
      .from('folders')
      .insert({ name: 'Parent' })
      .select()
      .single();
    expect(pErr).toBeNull();

    const { data: child, error: cErr } = await userClient
      .from('folders')
      .insert({ parent_id: parent!.id, name: 'Child' })
      .select()
      .single();
    expect(cErr).toBeNull();

    const { data: note, error: nErr } = await userClient
      .from('notes')
      .insert({ folder_id: parent!.id, title: 'Parent Note' })
      .select()
      .single();
    expect(nErr).toBeNull();

    // 2. Act: Delete parent with cascade_children = false
    const { error: rpcErr } = await userClient.rpc('delete_folder', {
      target_folder_id: parent!.id,
      cascade_children: false
    });
    expect(rpcErr).toBeNull();

    // 3. Assert: Parent has deleted_at != null
    const { data: updatedParent } = await adminClient.from('folders').select('*').eq('id', parent!.id).single();
    expect(updatedParent!.deleted_at).not.toBeNull();

    // Child folder has deleted_at == null and parent_id == null (orphaned to root)
    const { data: updatedChild } = await adminClient.from('folders').select('*').eq('id', child!.id).single();
    expect(updatedChild!.deleted_at).toBeNull();
    expect(updatedChild!.parent_id).toBeNull();

    // Note has deleted_at == null and folder_id == null (orphaned to root)
    const { data: updatedNote } = await adminClient.from('notes').select('*').eq('id', note!.id).single();
    expect(updatedNote!.deleted_at).toBeNull();
    expect(updatedNote!.folder_id).toBeNull();
  });

  it('TC-02: Recursively soft-deletes folder subtree when cascade_children = true', async () => {
    // 1. Arrange: Root folder -> Sub folder -> Sub Note
    const { data: root } = await userClient.from('folders').insert({ name: 'Root' }).select().single();
    const { data: sub } = await userClient.from('folders').insert({ parent_id: root!.id, name: 'Sub' }).select().single();
    const { data: note } = await userClient.from('notes').insert({ folder_id: sub!.id, title: 'Sub Note' }).select().single();

    // 2. Act: Delete root with cascade_children = true
    const { error: rpcErr } = await userClient.rpc('delete_folder', {
      target_folder_id: root!.id,
      cascade_children: true
    });
    expect(rpcErr).toBeNull();

    // 3. Assert: Root, subfolder, and note all have deleted_at != null
    const { data: trashedFolders } = await adminClient.from('folders').select('id, deleted_at').eq('user_id', testUserId);
    const { data: trashedNotes } = await adminClient.from('notes').select('id, deleted_at').eq('user_id', testUserId);

    expect(trashedFolders?.length).toBe(2);
    expect(trashedFolders?.every((f) => f.deleted_at !== null)).toBe(true);

    expect(trashedNotes?.length).toBe(1);
    expect(trashedNotes?.every((n) => n.deleted_at !== null)).toBe(true);
  });

  it('TC-03 & TC-04: Disables graph connections on soft delete and restores them', async () => {
    // 1. Arrange: Note A links to [[Note B]]
    const { data: noteB } = await userClient
      .from('notes')
      .insert({ title: 'Note B', content: 'Target content' })
      .select()
      .single();

    const { data: noteA } = await userClient
      .from('notes')
      .insert({ title: 'Note A', content: 'See [[Note B]] for details' })
      .select()
      .single();

    // Verify active edge exists
    let { data: edges } = await userClient
      .from('note_connections')
      .select('*')
      .eq('source_note_id', noteA!.id)
      .is('deleted_at', null);
    expect(edges?.length).toBe(1);
    expect(edges![0].target_note_id).toBe(noteB!.id);

    // 2. Act (TC-03): Soft-delete Note B
    const { error: delNoteErr } = await userClient
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteB!.id);
    expect(delNoteErr).toBeNull();

    // 3. Assert (TC-03): Edge is deactivated
    let { data: activeEdges } = await userClient
      .from('note_connections')
      .select('*')
      .eq('source_note_id', noteA!.id)
      .is('deleted_at', null);
    expect(activeEdges?.length).toBe(0);

    // 4. Act (TC-04): Restore Note B via restore_note RPC
    const { error: restoreErr } = await userClient.rpc('restore_note', { target_note_id: noteB!.id });
    expect(restoreErr).toBeNull();

    // Assert (TC-04): Edge is reactivated
    let { data: restoredEdges } = await userClient
      .from('note_connections')
      .select('*')
      .eq('source_note_id', noteA!.id)
      .is('deleted_at', null);
    expect(restoredEdges?.length).toBe(1);
    expect(restoredEdges![0].target_note_id).toBe(noteB!.id);
  });

  it('TC-05: Permanently purges items from database', async () => {
    const { data: note } = await userClient
      .from('notes')
      .insert({ title: 'Temporary', deleted_at: new Date().toISOString() })
      .select()
      .single();

    const { error: purgeErr } = await userClient.rpc('purge_item', {
      item_type: 'note',
      item_id: note!.id
    });
    expect(purgeErr).toBeNull();

    const { data: check } = await adminClient.from('notes').select('*').eq('id', note!.id);
    expect(check?.length).toBe(0);
  });

  it('TC-06: Title re-use guard permits identical title after soft-delete', async () => {
    // 1. Create active note "Idea"
    const { data: note1, error: n1Err } = await userClient
      .from('notes')
      .insert({ title: 'Idea', content: 'Original thought' })
      .select()
      .single();
    expect(n1Err).toBeNull();

    // 2. Creating another active note "Idea" (case-insensitive) should fail unique constraint
    const { error: duplicateErr } = await userClient
      .from('notes')
      .insert({ title: 'idea', content: 'Duplicate thought' });
    expect(duplicateErr).not.toBeNull();
    expect(duplicateErr?.code).toBe('23505'); // unique_violation

    // 3. Soft-delete first note
    await userClient.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', note1!.id);

    // 4. Now creating "Idea" should succeed because partial index only guards active notes
    const { data: note2, error: n2Err } = await userClient
      .from('notes')
      .insert({ title: 'Idea', content: 'New active thought' })
      .select()
      .single();
    expect(n2Err).toBeNull();
    expect(note2!.title).toBe('Idea');
    expect(note2!.id).not.toBe(note1!.id);
  });
});
