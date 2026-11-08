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
  const { data, error } = await supabase
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

export async function fetchListById(id: number | string, customClient?: SupabaseClient<Database>): Promise<ListRecord | null> {
  const numericId = Number(id);
  if (isNaN(numericId)) return null;

  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .eq('id', numericId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '22P02') return null;
    console.error('Error fetching list by id:', error);
    throw error;
  }
  return data as ListRecord;
}

export async function createList(name: string, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
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

export async function renameList(id: number | string, name: string, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const { data, error } = await supabase
    .from('lists')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', numericId)
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error renaming list:', error);
    throw error;
  }
  return data as ListRecord;
}

export async function updateListSortMode(id: number | string, sort_mode: TaskSortMode, customClient?: SupabaseClient<Database>): Promise<ListRecord> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const { data, error } = await supabase
    .from('lists')
    .update({ sort_mode, updated_at: new Date().toISOString() })
    .eq('id', numericId)
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
export async function trashListBundle(id: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const now = new Date().toISOString();

  // 1. Soft delete all live tasks in list with trash_reason = 'list_deleted'
  const { error: tasksErr } = await supabase
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'list_deleted', updated_at: now })
    .eq('list_id', numericId)
    .is('deleted_at', null);

  if (tasksErr) throw tasksErr;

  // 2. Soft delete list
  const { error: listErr } = await supabase
    .from('lists')
    .update({ deleted_at: now, trash_reason: 'list_deleted', updated_at: now })
    .eq('id', numericId);

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
  const numericListId = Number(listId);

  // 1. Fetch current list to get live_tasks_count
  const list = await fetchListById(numericListId, customClient);
  const totalLive = list?.live_tasks_count ?? 0;

  // 2. Build base query for tasks
  let query = supabase
    .from('tasks')
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .eq('list_id', numericListId)
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
        query = query.or(
          `created_at.gt.${payload.created_at},and(created_at.eq.${payload.created_at},id.gt.${payload.id})`
        );
      } else if (sortMode === 'manual' && payload.position !== undefined) {
        query = query.or(
          `position.gt.${payload.position},and(position.eq.${payload.position},id.gt.${payload.id})`
        );
      } else if (sortMode === 'priority' && payload.priority && payload.created_at) {
        query = query.or(
          `priority.lt.${payload.priority},and(priority.eq.${payload.priority},created_at.gt.${payload.created_at}),and(priority.eq.${payload.priority},created_at.eq.${payload.created_at},id.gt.${payload.id})`
        );
      }
    }
  }

  // Order by matching the composite index
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

  query = query.limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching tasks page:', error);
    throw error;
  }

  const items = (data || []) as TaskRecord[];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const extra = items.pop()!;
    const last = items[items.length - 1];
    if (last) {
      const payload: TaskCursorPayload = {
        sort_mode: sortMode,
        id: last.id,
        created_at: last.created_at,
        priority: last.priority,
        position: last.position
      };
      nextCursor = serializeCursor(payload);
    }
  }

  // 3. Count total matching filtered (if filters applied)
  let totalFiltered = totalLive;
  const hasFilters = (statusFilters && statusFilters.length > 0) || (priorityFilters && priorityFilters.length > 0);
  if (hasFilters) {
    let countQuery = supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', numericListId)
      .is('deleted_at', null);

    if (statusFilters && statusFilters.length > 0) {
      countQuery = countQuery.in('status', statusFilters);
    }
    if (priorityFilters && priorityFilters.length > 0) {
      countQuery = countQuery.in('priority', priorityFilters);
    }

    const { count, error: countErr } = await countQuery;
    if (!countErr && count !== null) {
      totalFiltered = count;
    }
  }

  return {
    tasks: items,
    nextCursor,
    totalLive,
    totalFiltered
  };
}

export async function fetchTaskById(id: number | string, customClient?: SupabaseClient<Database>): Promise<TaskRecord | null> {
  const numericId = Number(id);
  if (isNaN(numericId)) return null;

  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('tasks')
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .eq('id', numericId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '22P02') return null;
    console.error('Error fetching task by id:', error);
    throw error;
  }
  return data as TaskRecord;
}

export async function createTask(
  payload: {
    list_id: number | string;
    title: string;
    description_html?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  },
  customClient?: SupabaseClient<Database>
): Promise<TaskRecord> {
  const supabase = getClient(customClient);
  const numericListId = Number(payload.list_id);

  // Compute position as max(position) + 1 for manual sorting mode
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', numericListId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = maxPosData && maxPosData.length > 0 ? (maxPosData[0].position || 0) + 1 : 1;

  const descHtml = payload.description_html ?? '';
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      list_id: numericListId,
      title: payload.title.trim(),
      description_html: descHtml,
      status: payload.status ?? 'todo',
      priority: payload.priority ?? 'none',
      position: nextPos
    })
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  const created = data as TaskRecord;

  // Sync [[ task links
  await syncTaskLinks(created.id, descHtml, customClient);

  return created;
}

export async function updateTask(
  id: number | string,
  payload: {
    title?: string;
    description_html?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  },
  customClient?: SupabaseClient<Database>
): Promise<TaskRecord> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const updates: Database['public']['Tables']['tasks']['Update'] = { updated_at: new Date().toISOString() };
  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.description_html !== undefined) updates.description_html = payload.description_html;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.priority !== undefined) updates.priority = payload.priority;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', numericId)
    .select('id, list_id, title, description_html, status, priority, position, deleted_at, trash_reason, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  const updated = data as TaskRecord;

  if (payload.description_html !== undefined) {
    await syncTaskLinks(updated.id, payload.description_html, customClient);
  }

  return updated;
}

export async function updateTaskStatus(id: number | string, status: TaskStatus, customClient?: SupabaseClient<Database>): Promise<TaskRecord> {
  return updateTask(id, { status }, customClient);
}

export async function updateTaskPriority(id: number | string, priority: TaskPriority, customClient?: SupabaseClient<Database>): Promise<TaskRecord> {
  return updateTask(id, { priority }, customClient);
}

export async function updateTaskPosition(id: number | string, position: number, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const { error } = await supabase
    .from('tasks')
    .update({ position, updated_at: new Date().toISOString() })
    .eq('id', numericId);

  if (error) {
    console.error('Error updating task position:', error);
    throw error;
  }
}

/**
 * Soft delete task individually
 */
export async function trashTask(id: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericId = Number(id);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'individual', updated_at: now })
    .eq('id', numericId);

  if (error) {
    console.error('Error trashing task:', error);
    throw error;
  }
}

/**
 * Soft delete multiple tasks in bulk
 */
export async function bulkTrashTasks(ids: (number | string)[], customClient?: SupabaseClient<Database>): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getClient(customClient);
  const numericIds = ids.map(Number);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: now, trash_reason: 'bulk', updated_at: now })
    .in('id', numericIds);

  if (error) {
    console.error('Error bulk trashing tasks:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// TASK LINKS & CHIP RESOLUTION
// -------------------------------------------------------------

export function extractTaskIdsFromHtml(html: string): number[] {
  if (!html) return [];
  const matches = html.matchAll(/data-task-id="([^"]+)"/g);
  const ids = new Set<number>();
  for (const m of matches) {
    if (m[1]) {
      const num = Number(m[1]);
      if (!isNaN(num)) ids.add(num);
    }
  }
  return Array.from(ids);
}

export async function syncTaskLinks(sourceTaskId: number | string, html: string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numSourceId = Number(sourceTaskId);
  const targetIds = extractTaskIdsFromHtml(html);

  // 1. Fetch current links for this source
  const { data: existing, error: fetchErr } = await supabase
    .from('task_links')
    .select('target_task_id')
    .eq('source_task_id', numSourceId);

  if (fetchErr) throw fetchErr;

  const currentTargets = new Set<number>((existing || []).map((row) => row.target_task_id));
  const newTargets = new Set<number>(targetIds.filter(id => id !== numSourceId));

  const toInsert = [...newTargets].filter(id => !currentTargets.has(id));
  const toDelete = [...currentTargets].filter(id => !newTargets.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('task_links')
      .delete()
      .eq('source_task_id', numSourceId)
      .in('target_task_id', toDelete);
    if (delErr) console.warn('Error deleting stale links:', delErr);
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map(target_task_id => ({
      source_task_id: numSourceId,
      target_task_id
    }));
    const { error: insErr } = await supabase
      .from('task_links')
      .insert(rows);
    if (insErr) console.warn('Error inserting new links:', insErr);
  }
}

export async function resolveChips(taskIds: (number | string)[], customClient?: SupabaseClient<Database>): Promise<Map<number, ResolvedChip>> {
  const map = new Map<number, ResolvedChip>();
  if (!taskIds || taskIds.length === 0) return map;

  const numericIds = taskIds.map(Number);
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, list_id, deleted_at')
    .in('id', numericIds);

  if (error) {
    console.error('Error resolving chips:', error);
  }

  const foundMap = new Map<number, any>((data || []).map((t) => [t.id, t]));

  for (const id of numericIds) {
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

export async function fetchBacklinks(targetTaskId: number | string, customClient?: SupabaseClient<Database>): Promise<TaskBacklink[]> {
  const supabase = getClient(customClient);
  const numericTargetId = Number(targetTaskId);
  const { data, error } = await supabase
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
    .eq('target_task_id', numericTargetId);

  if (error) {
    console.error('Error fetching backlinks:', error);
    return [];
  }

  const backlinks: TaskBacklink[] = [];
  for (const item of (data || [])) {
    const src = item.tasks as any;
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
  listId: number | string,
  query: string,
  excludeId?: number | string,
  customClient?: SupabaseClient<Database>
): Promise<Array<{ id: number; title: string }>> {
  const supabase = getClient(customClient);
  const numericListId = Number(listId);
  let q = supabase
    .from('tasks')
    .select('id, title')
    .eq('list_id', numericListId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8);

  if (query && query.trim()) {
    q = q.ilike('title', `%${query.trim()}%`);
  }

  if (excludeId !== undefined) {
    q = q.neq('id', Number(excludeId));
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error searching tasks:', error);
    return [];
  }
  return (data || []) as Array<{ id: number; title: string }>;
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
  const { data: trashedLists, error: listsErr } = await supabase
    .from('lists')
    .select('id, name, owner_id, sort_mode, live_tasks_count, active_tasks_count, deleted_at, trash_reason, created_at, updated_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (listsErr) throw listsErr;

  // Trashed tasks (including list name and list.deleted_at to check restore conflicts)
  const { data: trashedTasks, error: tasksErr } = await supabase
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

export async function restoreListBundle(listId: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericListId = Number(listId);
  const now = new Date().toISOString();

  // 1. Restore list
  const { error: listErr } = await supabase
    .from('lists')
    .update({ deleted_at: null, trash_reason: null, updated_at: now })
    .eq('id', numericListId);

  if (listErr) throw listErr;

  // 2. Restore tasks where list_id = listId AND trash_reason = 'list_deleted'
  const { error: tasksErr } = await supabase
    .from('tasks')
    .update({ deleted_at: null, trash_reason: null, updated_at: now })
    .eq('list_id', numericListId)
    .eq('trash_reason', 'list_deleted');

  if (tasksErr) throw tasksErr;
}

export async function restoreTask(taskId: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericTaskId = Number(taskId);

  // 1. Fetch task and its parent list
  const { data: task, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, list_id, lists(deleted_at)')
    .eq('id', numericTaskId)
    .single();

  if (fetchErr || !task) throw new Error('Task not found');
  if ((task.lists as any)?.deleted_at !== null) {
    throw new Error('Restore the list first.');
  }

  // 2. Compute max position in list
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', task.list_id)
    .order('position', { ascending: false })
    .limit(1);

  const newPos = maxPosData && maxPosData.length > 0 ? (maxPosData[0].position || 0) + 1 : 1;

  // 3. Clear deleted_at, set new position
  const { error: updateErr } = await supabase
    .from('tasks')
    .update({
      deleted_at: null,
      trash_reason: null,
      position: newPos,
      updated_at: new Date().toISOString()
    })
    .eq('id', numericTaskId);

  if (updateErr) throw updateErr;
}

export async function deleteListPermanent(listId: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericListId = Number(listId);
  // Hard delete on lists cascades to tasks & task_links
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', numericListId);

  if (error) throw error;
}

export async function deleteTaskPermanent(taskId: number | string, customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  const numericTaskId = Number(taskId);
  // Hard delete on task cascades to task_links
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', numericTaskId);

  if (error) throw error;
}

export async function emptyTrash(customClient?: SupabaseClient<Database>): Promise<void> {
  const supabase = getClient(customClient);
  // Hard delete all trashed tasks and lists
  const { error: tasksErr } = await supabase
    .from('tasks')
    .delete()
    .not('deleted_at', 'is', null);

  if (tasksErr) throw tasksErr;

  const { error: listsErr } = await supabase
    .from('lists')
    .delete()
    .not('deleted_at', 'is', null);

  if (listsErr) throw listsErr;
}
