<script lang="ts">
  import type {
    TaskRecord,
    TaskStatus,
    TaskPriority,
    TaskSortMode,
  } from "$lib/types/tasks";
  import StatusPill from "../shared/StatusPill.svelte";
  import PriorityFlag from "../shared/PriorityFlag.svelte";

  interface Props {
    task: TaskRecord;
    listId: string;
    sortMode: TaskSortMode;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onStatusChange: (id: string, s: TaskStatus) => void;
    onPriorityChange: (id: string, p: TaskPriority) => void;
    onDragStart?: (e: DragEvent, id: string) => void;
    onDragOver?: (e: DragEvent, id: string) => void;
    onDrop?: (e: DragEvent, id: string) => void;
  }

  let {
    task,
    listId,
    sortMode,
    isSelected,
    onToggleSelect,
    onStatusChange,
    onPriorityChange,
    onDragStart,
    onDragOver,
    onDrop,
  }: Props = $props();
</script>

<div
  class="tasks-table-row"
  draggable={sortMode === "manual"}
  ondragstart={(e) => onDragStart?.(e, task.id)}
  ondragover={(e) => onDragOver?.(e, task.id)}
  ondrop={(e) => onDrop?.(e, task.id)}
>
  <div style="display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1;">
    {#if sortMode === "manual"}
      <span
        style="cursor: grab; color: var(--text-muted); user-select: none; font-size: 0.875rem;"
      >
        ⋮⋮
      </span>
    {/if}

    <input
      type="checkbox"
      checked={isSelected}
      onchange={() => onToggleSelect(task.id)}
    />

    <PriorityFlag
      priority={task.priority}
      onChange={(p) => onPriorityChange(task.id, p)}
    />

    <a
      href={`/tasks/lists/${listId}/tasks/${task.id}`}
      style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: var(--text-primary); text-decoration: none; flex: 1;"
    >
      {task.title}
    </a>
  </div>

  <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; margin-left: 1rem;">
    <StatusPill
      status={task.status}
      onChange={(s) => onStatusChange(task.id, s)}
    />
  </div>
</div>
