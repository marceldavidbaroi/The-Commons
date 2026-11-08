import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
  ListRecord,
  TaskRecord,
  TaskSortMode,
  TaskStatus,
  TaskPriority,
  TaskCursorPayload,
  FetchTasksParams,
  TasksPageResponse,
  ResolvedChip,
  TaskBacklink
} from '$lib/types/tasks';

function getClient(customClient?: SupabaseClient<Database>): SupabaseClient<Database> {
  return customClient || getSupabaseClient();
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 5,
  high: 4,
  medium: 3,
  low: 2,
  none: 1
};

export function serializeCursor(payload: TaskCursorPayload): string {
  return btoa(JSON.stringify(payload));
}

export function deserializeCursor(cursor: string): TaskCursorPayload | null {
  try {
    return JSON.parse(atob(cursor)) as TaskCursorPayload;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// LISTS API
// -------------------------------------------------------------

export async function fetchLists(customClient?: SupabaseClient<Database>): Promise<ListRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('lists')
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lists:', error);
    throw error;
  }
  return (data || []) as ListRecord[];
}

export async function fetchListById(id: string, customClient?: SupabaseClient<Database>): Promise<ListRecord | null> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('lists')
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching list by id:', error);
    throw error;
  }
  return data as ListRecord;
}

export async function createList(name: string, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('lists')
    .insert({ name: name.trim() })
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating list:', error);
    throw error;
  }
  return data as ListRecord;
}

export async function renameList(id: string, name: string, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('lists')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error renaming list:', error);
    throw error;
  }
  return data as ListRecord;
}

export async function updateListSortMode(id: string, sort_mode: TaskSortMode, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('lists')
    .update({ sort_mode, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error updating list sort mode:', error);
    throw error;
  }
  return data as ListRecord;
}

/**
 * Soft delete list and all its live tasks as a bundle.
 */
export async function trashListBundle(id: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const now = new Date().toISOString();

  // 1. Soft delete all live tasks in list with trash_reason = 'list_deleted'
  const { error: tasksErr } = await (supabase as any)
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'list_deleted', updated_at: now })
    .eq('list_id', id)
    .is('deleted_at', null);

  if (tasksErr) throw tasksErr;

  // 2. Soft delete list
  const { error: listErr } = await (supabase as any)
    .from('lists')
    .update({ deleted_at: now, trash_reason: 'list_deleted', updated_at: now })
    .eq('id', id);

  if (listErr) throw listErr;
}

// -------------------------------------------------------------
// TASKS API & KEYSET PAGINATION
// -------------------------------------------------------------

export async function fetchTasksPage(
  params: FetchTasksParams,
  customClient?: SupabaseClient<Database>
): Promise<TasksPageResponse> {
  const supabase = getClient(customClient);
  const { listId, sortMode, statusFilters, priorityFilters, cursor, limit = 10 } = params;

  // 1. Fetch current list to get live_tasks_count
  const list = await fetchListById(listId, customClient);
  const totalLive = list?.live_tasks_count ?? 0;

  // 2. Build base query for tasks
  let query = (supabase as any)
    .from('tasks')
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .eq('list_id', listId)
    .is('deleted_at', null);

  if (statusFilters && statusFilters.length > 0) {
    query = query.in('status', statusFilters);
  }

  if (priorityFilters && priorityFilters.length > 0) {
    query = query.in('priority', priorityFilters);
  }

  // Handle keyset cursor if present
  if (cursor) {
    const payload = deserializeCursor(cursor);
    if (payload && payload.sort_mode === sortMode) {
      if (sortMode === 'created' && payload.created_at) {
        // (created_at > payload.created_at) OR (created_at = payload.created_at AND id > payload.id)
        query = query.or(
          `created_at.gt.${payload.created_at},and(created_at.eq.${payload.created_at},id.gt.${payload.id})`
        );
      } else if (sortMode === 'manual' && payload.position !== undefined) {
        // (position > payload.position) OR (position = payload.position AND id > payload.id)
        query = query.or(
          `position.gt.${payload.position},and(position.eq.${payload.position},id.gt.${payload.id})`
        );
      } else if (sortMode === 'priority' && payload.priority && payload.created_at) {
        // PostgreSQL enum order: urgent > high > medium > low > none
        // Keyset condition for mixed direction (priority DESC, created_at ASC, id ASC)
        // With PostgREST, we can achieve this or fallback to in-memory slicing if needed.
        // In PostgREST syntax with .or():
        // Since enum comparison in PostgREST is supported:
        // priority < p OR (priority = p AND created_at > c) OR (priority = p AND created_at = c AND id > i)
        query = query.or(
          `priority.lt.${payload.priority},and(priority.eq.${payload.priority},created_at.gt.${payload.created_at}),and(priority.eq.${payload.priority},created_at.eq.${payload.created_at},id.gt.${payload.id})`
        );
      }
    }
  }

  // Apply sorting
  if (sortMode === 'created') {
    query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
  } else if (sortMode === 'priority') {
    query = query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
  } else if (sortMode === 'manual') {
    query = query.order('position', { ascending: true }).order('id', { ascending: true });
  }

  // Fetch limit + 1 to detect next page
  query = query.limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching tasks page:', error);
    throw error;
  }

  const rows = (data || []) as TaskRecord[];
  const hasMore = rows.length > limit;
  const tasks = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && tasks.length > 0) {
    const last = tasks[tasks.length - 1];
    nextCursor = serializeCursor({
      sort_mode: sortMode,
      created_at: last.created_at,
      priority: last.priority,
      position: last.position,
      id: last.id
    });
  }

  // Determine totalFiltered: if no filters, it equals totalLive. If filters active, count matching rows.
  let totalFiltered = totalLive;
  const hasFilters = (statusFilters && statusFilters.length > 0) || (priorityFilters && priorityFilters.length > 0);
  if (hasFilters) {
    let countQuery = (supabase as any)
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId)
      .is('deleted_at', null);

    if (statusFilters && statusFilters.length > 0) {
      countQuery = countQuery.in('status', statusFilters);
    }
    if (priorityFilters && priorityFilters.length > 0) {
      countQuery = countQuery.in('priority', priorityFilters);
    }
    const { count } = await countQuery;
    totalFiltered = count ?? tasks.length;
  }

  return {
    tasks,
    nextCursor,
    totalLive,
    totalFiltered
  };
}

export async function fetchTaskById(id: string, customClient?: SupabaseClient<Database>): Promise<TaskRecord | null> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('tasks')
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching task by id:', error);
    throw error;
  }
  return data as TaskRecord;
}

export async function createTask(
  payload: {
    list_id: string;
    title: string;
    description_html?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  },
  customClient?: SupabaseClient<Database>
): Promise<TaskRecord> {
  const supabase = getClient(customClient);

  // Determine max position for new task
  const { data: maxPosData } = await (supabase as any)
    .from('tasks')
    .select('position')
    .eq('list_id', payload.list_id)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = maxPosData && maxPosData.length > 0 ? (maxPosData[0].position || 0) + 1 : 1;

  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert({
      list_id: payload.list_id,
      title: payload.title.trim(),
      description_html: payload.description_html || '',
      status: payload.status || 'todo',
      priority: payload.priority || 'none',
      position: nextPos
    })
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  const created = data as TaskRecord;
  if (created.description_html) {
    await syncTaskLinks(created.id, created.description_html, customClient);
  }

  return created;
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<TaskRecord, 'title' | 'description_html' | 'status' | 'priority' | 'position'>>,
  customClient?: SupabaseClient<Database>
): Promise<TaskRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  const updated = data as TaskRecord;
  if (updates.description_html !== undefined) {
    await syncTaskLinks(updated.id, updated.description_html, customClient);
  }

  return updated;
}

export async function updateTaskStatus(id: string, status: TaskStatus, customClient?: SupabaseClient<Database>): Promise<TaskRecord> {
  return updateTask(id, { status }, customClient);
}

export async function updateTaskPriority(id: string, priority: TaskPriority, customClient?: SupabaseClient<Database>): Promise<TaskRecord> {
  return updateTask(id, { priority }, customClient);
}

export async function updateTaskPosition(id: string, position: number, customClient?: SupabaseClient<Database>): Promise<TaskRecord> {
  return updateTask(id, { position }, customClient);
}

export async function trashTask(id: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'individual', updated_at: now })
    .eq('id', id);

  if (error) throw error;
}

export async function bulkTrashTasks(ids: string[], customClient?: SupabaseClient<Database>): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getClient(customClient);
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'bulk', updated_at: now })
    .in('id', ids);

  if (error) throw error;
}

// -------------------------------------------------------------
// TASK LINKS & CHIP RESOLUTION
// -------------------------------------------------------------

export function extractTaskIdsFromHtml(html: string): string[] {
  if (!html) return [];
  const matches = html.matchAll(/data-task-id="([0-9a-fA-F-]+)"/g);
  const ids = new Set<string>();
  for (const m of matches) {
    if (m[1]) ids.add(m[1]);
  }
  return Array.from(ids);
}

export async function syncTaskLinks(sourceTaskId: string, html: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const targetIds = extractTaskIdsFromHtml(html);

  // 1. Fetch current links for this source
  const { data: existing, error: fetchErr } = await (supabase as any)
    .from('task_links')
    .select('target_task_id')
    .eq('source_task_id', sourceTaskId);

  if (fetchErr) throw fetchErr;

  const currentTargets = new Set<string>((existing || []).map((row: any) => row.target_task_id));
  const newTargets = new Set<string>(targetIds.filter(id => id !== sourceTaskId));

  const toInsert = [...newTargets].filter(id => !currentTargets.has(id));
  const toDelete = [...currentTargets].filter(id => !newTargets.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await (supabase as any)
      .from('task_links')
      .delete()
      .eq('source_task_id', sourceTaskId)
      .in('target_task_id', toDelete);
    if (delErr) console.warn('Error deleting stale links:', delErr);
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map(target_task_id => ({
      source_task_id: sourceTaskId,
      target_task_id
    }));
    const { error: insErr } = await (supabase as any)
      .from('task_links')
      .insert(rows);
    if (insErr) console.warn('Error inserting new links:', insErr);
  }
}

export async function resolveChips(taskIds: string[], customClient?: SupabaseClient<Database>): Promise<Map<string, ResolvedChip>> {
  const map = new Map<string, ResolvedChip>();
  if (!taskIds || taskIds.length === 0) return map;

  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('tasks')
    .select('id, title, list_id, deleted_at')
    .in('id', taskIds);

  if (error) {
    console.error('Error resolving chips:', error);
  }

  const foundMap = new Map<string, any>((data || []).map((t: any) => [t.id, t]));

  for (const id of taskIds) {
    const found = foundMap.get(id);
    if (!found) {
      map.set(id, { id, title: 'Deleted task', list_id: null, state: 'gone' });
    } else if (found.deleted_at !== null) {
      map.set(id, { id, title: found.title, list_id: found.list_id, state: 'trash' });
    } else {
      map.set(id, { id, title: found.title, list_id: found.list_id, state: 'live' });
    }
  }

  return map;
}

export async function fetchBacklinks(targetTaskId: string, customClient?: SupabaseClient<Database>): Promise<TaskBacklink[]> {
  const supabase = getClient(customClient);
  const { data, error } = await (supabase as any)
    .from('task_links')
    .select(`
      source_task_id,
      tasks!task_links_source_task_id_fkey(
        id,
        title,
        deleted_at,
        list_id,
        lists(id, name)
      )
    `)
    .eq('target_task_id', targetTaskId);

  if (error) {
    console.error('Error fetching backlinks:', error);
    return [];
  }

  const backlinks: TaskBacklink[] = [];
  for (const item of (data || [])) {
    const src = item.tasks;
    if (src && src.deleted_at === null) {
      backlinks.push({
        source_task_id: src.id,
        source_task_title: src.title,
        list_id: src.list_id,
        list_name: src.lists?.name || 'Untitled List'
      });
    }
  }
  return backlinks;
}

export async function searchListTasks(
  listId: string,
  query: string,
  excludeId?: string,
  customClient?: SupabaseClient<Database>
): Promise<Array<{ id: string; title: string }>> {
  const supabase = getClient(customClient);
  let q = (supabase as any)
    .from('tasks')
    .select('id, title')
    .eq('list_id', listId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8);

  if (query && query.trim()) {
    q = q.ilike('title', `%${query.trim()}%`);
  }

  if (excludeId) {
    q = q.neq('id', excludeId);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error searching tasks:', error);
    return [];
  }
  return (data || []) as Array<{ id: string; title: string }>;
}

// -------------------------------------------------------------
// TRASH MANAGEMENT
// -------------------------------------------------------------

export async function fetchTrash(customClient?: SupabaseClient<Database>): Promise<{
  lists: ListRecord[];
  tasks: Array<TaskRecord & { list_name: string; list_deleted_at: string | null }>;
}> {
  const supabase = getClient(customClient);

  // Trashed lists
  const { data: trashedLists, error: listsErr } = await (supabase as any)
    .from('lists')
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (listsErr) throw listsErr;

  // Trashed tasks (including list name and list.deleted_at to check restore conflicts)
  const { data: trashedTasks, error: tasksErr } = await (supabase as any)
    .from('tasks')
    .select(`
      id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at,
      lists(name, deleted_at)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (tasksErr) throw tasksErr;

  const formattedTasks = (trashedTasks || []).map((t: any) => ({
    id: t.id,
    list_id: t.list_id,
    title: t.title,
    description_html: t.description_html,
    status: t.status,
    priority: t.priority,
    position: t.position,
    deleted_at: t.deleted_at,
    trash_reason: t.trash_reason,
    created_at: t.created_at,
    updated_at: t.updated_at,
    list_name: t.lists?.name || 'Untitled List',
    list_deleted_at: t.lists?.deleted_at ?? null
  }));

  return {
    lists: (trashedLists || []) as ListRecord[],
    tasks: formattedTasks
  };
}

export async function restoreListBundle(listId: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const now = new Date().toISOString();

  // 1. Restore list
  const { error: listErr } = await (supabase as any)
    .from('lists')
    .update({ deleted_at: null, trash_reason: null, updated_at: now })
    .eq('id', listId);

  if (listErr) throw listErr;

  // 2. Restore tasks where list_id = listId AND trash_reason = 'list_deleted'
  const { error: tasksErr } = await (supabase as any)
    .from('tasks')
    .update({ deleted_at: null, trash_reason: null, updated_at: now })
    .eq('list_id', listId)
    .eq('trash_reason', 'list_deleted');

  if (tasksErr) throw tasksErr;
}

export async function restoreTask(taskId: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);

  // 1. Fetch task and its parent list
  const { data: task, error: fetchErr } = await (supabase as any)
    .from('tasks')
    .select('id, list_id, lists(deleted_at)')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) throw new Error('Task not found');
  if (task.lists?.deleted_at !== null) {
    throw new Error('Restore the list first.');
  }

  // 2. Compute max position in list
  const { data: maxPosData } = await (supabase as any)
    .from('tasks')
    .select('position')
    .eq('list_id', task.list_id)
    .order('position', { ascending: false })
    .limit(1);

  const newPos = maxPosData && maxPosData.length > 0 ? (maxPosData[0].position || 0) + 1 : 1;

  // 3. Clear deleted_at, set new position
  const { error: updateErr } = await (supabase as any)
    .from('tasks')
    .update({
      deleted_at: null,
      trash_reason: null,
      position: newPos,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (updateErr) throw updateErr;
}

export async function deleteListPermanent(listId: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  // Hard delete on lists cascades to tasks & task_links
  const { error } = await (supabase as any)
    .from('lists')
    .delete()
    .eq('id', listId);

  if (error) throw error;
}

export async function deleteTaskPermanent(taskId: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  // Hard delete on task cascades to task_links
  const { error } = await (supabase as any)
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

export async function emptyTrash(customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  // Hard delete all trashed tasks and lists
  const { error: tasksErr } = await (supabase as any)
    .from('tasks')
    .delete()
    .not('deleted_at', 'is', null);

  if (tasksErr) throw tasksErr;

  const { error: listsErr } = await (supabase as any)
    .from('lists')
    .delete()
    .not('deleted_at', 'is', null);

  if (listsErr) throw listsErr;
}

