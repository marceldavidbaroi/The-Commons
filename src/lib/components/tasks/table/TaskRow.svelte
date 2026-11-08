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
  class="group flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
  draggable={sortMode === "manual"}
  ondragstart={(e) => onDragStart?.(e, task.id)}
  ondragover={(e) => onDragOver?.(e, task.id)}
  ondrop={(e) => onDrop?.(e, task.id)}
>
  <div class="flex items-center gap-2.5 min-w-0 flex-1">
    {#if sortMode === "manual"}
      <span
        class="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 dark:text-slate-600 select-none"
      >
        ⋮⋮
      </span>
    {/if}

    <input
      type="checkbox"
      checked={isSelected}
      onchange={() => onToggleSelect(task.id)}
      class="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-3.5 w-3.5"
    />

    <PriorityFlag
      priority={task.priority}
      onChange={(p) => onPriorityChange(task.id, p)}
    />

    <a
      href={`/tasks/lists/${listId}/tasks/${task.id}`}
      class="truncate font-medium text-slate-800 dark:text-slate-200 hover:text-primary transition-colors flex-1"
    >
      {task.title}
    </a>
  </div>

  <div class="flex items-center gap-3 shrink-0 ml-4">
    <StatusPill
      status={task.status}
      onChange={(s) => onStatusChange(task.id, s)}
    />
  </div>
</div>
