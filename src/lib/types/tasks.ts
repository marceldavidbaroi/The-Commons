export type TaskSortMode = 'created' | 'priority' | 'manual';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type TaskTrashReason = 'individual' | 'bulk' | 'list_deleted';
export type ListTrashReason = 'list_deleted';

export interface ListRecord {
  id: string;
  name: string;
  owner_id: string;
  sort_mode: TaskSortMode;
  live_tasks_count: number;
  active_tasks_count: number;
  deleted_at: string | null;
  trash_reason: ListTrashReason | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  list_id: string;
  title: string;
  description_html: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  deleted_at: string | null;
  trash_reason: TaskTrashReason | null;
  created_at: string;
  updated_at: string;
}

export interface TaskLinkRecord {
  source_task_id: string;
  target_task_id: string;
  created_at: string;
}

export interface TaskCursorPayload {
  sort_mode: TaskSortMode;
  created_at?: string;
  priority?: TaskPriority;
  position?: number;
  id: string;
}

export interface FetchTasksParams {
  listId: string;
  sortMode: TaskSortMode;
  statusFilters?: TaskStatus[];
  priorityFilters?: TaskPriority[];
  cursor?: string | null;
  limit?: number;
}

export interface TasksPageResponse {
  tasks: TaskRecord[];
  nextCursor: string | null;
  totalLive: number;
  totalFiltered: number;
}

export type ChipState = 'live' | 'trash' | 'gone';

export interface ResolvedChip {
  id: string;
  title: string;
  list_id: string | null;
  state: ChipState;
}

export interface TaskBacklink {
  source_task_id: string;
  source_task_title: string;
  list_id: string;
  list_name: string;
}

