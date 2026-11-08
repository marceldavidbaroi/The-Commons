<script lang="ts">
  import type { TaskStatus, TaskPriority } from "$lib/types/tasks";

  interface Props {
    status: TaskStatus;
    priority: TaskPriority;
    onStatusChange: (s: TaskStatus) => void;
    onPriorityChange: (p: TaskPriority) => void;
  }

  let { status, priority, onStatusChange, onPriorityChange }: Props = $props();

  const STATUSES: Array<{ id: TaskStatus; label: string }> = [
    { id: "todo", label: "To do" },
    { id: "in_progress", label: "In progress" },
    { id: "done", label: "Done" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const PRIORITIES: Array<{ id: TaskPriority; label: string }> = [
    { id: "none", label: "None" },
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "urgent", label: "Urgent" },
  ];
</script>

<div class="flex flex-wrap items-center gap-4 py-2 text-xs">
  <div class="flex items-center gap-2">
    <label for="task-status" class="font-medium text-slate-500">Status:</label>
    <select
      id="task-status"
      value={status}
      onchange={(e) => onStatusChange(e.currentTarget.value as TaskStatus)}
      class="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {#each STATUSES as s}
        <option value={s.id}>{s.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex items-center gap-2">
    <label for="task-priority" class="font-medium text-slate-500"
      >Priority:</label
    >
    <select
      id="task-priority"
      value={priority}
      onchange={(e) => onPriorityChange(e.currentTarget.value as TaskPriority)}
      class="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {#each PRIORITIES as p}
        <option value={p.id}>{p.label}</option>
      {/each}
    </select>
  </div>
</div>
