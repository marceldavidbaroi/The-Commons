# API & Service Contract: Task Ledger

## 1. TypeScript Types (`src/types/tasks.ts`)

```typescript
import { TagRow } from "./tags";

export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled" | "deferred";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface TaskRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  
  scheduled_date: string | null; // ISO YYYY-MM-DD
  due_date: string | null;       // ISO Timestamptz
  completed_at: string | null;   // ISO Timestamptz
  
  time_estimate_minutes: number | null;
  actual_minutes: number | null;
  sort_order: number;
  
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends TaskRow {
  tags?: TagRow[];
  subtasks?: TaskWithDetails[];
}

export interface TaskInsert {
  title: string;
  description?: string | null;
  parent_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduled_date?: string | null;
  due_date?: string | null;
  time_estimate_minutes?: number | null;
  actual_minutes?: number | null;
  sort_order?: number;
  tag_ids?: number[];
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduled_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  time_estimate_minutes?: number | null;
  actual_minutes?: number | null;
  sort_order?: number;
  tag_ids?: number[];
}

export interface TaskFilterParams {
  scheduled_date?: string; // specific day, e.g. today
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  tag_ids?: number[];
  search?: string;
  include_subtasks?: boolean;
}
```

---

## 2. Service Layer Interface (`src/services/tasks.service.ts`)

```typescript
export interface ITasksService {
  // Query operations
  getTasks(params?: TaskFilterParams): Promise<TaskWithDetails[]>;
  getTaskById(id: string): Promise<TaskWithDetails | null>;
  getDailyAgenda(dateStr: string): Promise<{
    scheduled: TaskWithDetails[];
    overdue: TaskWithDetails[];
    completedToday: TaskWithDetails[];
  }>;

  // Mutations
  createTask(payload: TaskInsert): Promise<TaskWithDetails>;
  updateTask(id: string, payload: TaskUpdate): Promise<TaskWithDetails>;
  toggleTaskStatus(id: string, isCompleted: boolean): Promise<TaskWithDetails>;
  reorderTasks(orderedTaskIds: string[]): Promise<void>;
  deleteTask(id: string): Promise<void>;
  
  // Tag Associations
  assignTaskTags(taskId: string, tagIds: number[]): Promise<void>;
  removeTaskTag(taskId: string, tagId: number): Promise<void>;
}
```

---

## 3. React Query Hooks (`src/hooks/queries/use-tasks.ts`)

- `useTasks(params?: TaskFilterParams)`: Fetches filtered list of tasks.
- `useDailyAgenda(dateStr: string)`: Fetches categorized daily task agenda.
- `useTask(id: string)`: Single task details with subtasks and assigned tags.
- `useCreateTask()`: Optimistic task creation.
- `useUpdateTask()`: Task editing and inline field updates.
- `useToggleTaskStatus()`: Instant checkbox toggle with optimistic update.
- `useReorderTasks()`: Drag-and-drop daily sort order.
- `useDeleteTask()`: Task removal with subtree cleanup.
