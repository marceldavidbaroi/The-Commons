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

<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1.5rem; padding: 0.5rem 0;">
  <div style="display: flex; align-items: center; gap: 0.5rem;">
    <label for="task-status" class="tasks-form-label">Status:</label>
    <select
      id="task-status"
      value={status}
      onchange={(e) => onStatusChange(e.currentTarget.value as TaskStatus)}
      class="tasks-select"
    >
      {#each STATUSES as s}
        <option value={s.id}>{s.label}</option>
      {/each}
    </select>
  </div>

  <div style="display: flex; align-items: center; gap: 0.5rem;">
    <label for="task-priority" class="tasks-form-label">Priority:</label>
    <select
      id="task-priority"
      value={priority}
      onchange={(e) => onPriorityChange(e.currentTarget.value as TaskPriority)}
      class="tasks-select"
    >
      {#each PRIORITIES as p}
        <option value={p.id}>{p.label}</option>
      {/each}
    </select>
  </div>
</div>
