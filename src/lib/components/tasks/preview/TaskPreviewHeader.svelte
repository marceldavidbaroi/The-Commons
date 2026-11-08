<script lang="ts">
  import type { TaskRecord, TaskStatus, TaskPriority } from "$lib/types/tasks";
  import StatusPill from "../shared/StatusPill.svelte";
  import PriorityFlag from "../shared/PriorityFlag.svelte";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    task: TaskRecord;
    listId: string;
    onStatusChange: (status: TaskStatus) => void;
    onPriorityChange: (priority: TaskPriority) => void;
    onTrash: () => Promise<void>;
  }

  let { task, listId, onStatusChange, onPriorityChange, onTrash }: Props =
    $props();

  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  async function handleTrashConfirm() {
    isDeleting = true;
    try {
      await onTrash();
    } finally {
      isDeleting = false;
    }
  }
</script>

<div
  class="flex items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800"
>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <a
        href={`/tasks/lists/${listId}`}
        class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        ← Back to list
      </a>
    </div>

    <h1
      class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
    >
      {task.title}
    </h1>

    <div class="flex items-center gap-3 pt-1">
      <StatusPill status={task.status} onChange={onStatusChange} />
      <div class="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Priority:</span>
        <PriorityFlag priority={task.priority} onChange={onPriorityChange} />
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <a
      href={`/tasks/lists/${listId}/tasks/${task.id}/edit`}
      class="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      Edit
    </a>
    <button
      type="button"
      onclick={() => (showDeleteConfirm = true)}
      class="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
    >
      Move to trash
    </button>
  </div>
</div>

{#if showDeleteConfirm}
  <ConfirmDialog
    title="Move task to trash?"
    description={`Are you sure you want to move "${task.title}" to trash?`}
    confirmLabel={isDeleting ? "Moving..." : "Move to trash"}
    isDestructive={true}
    onConfirm={handleTrashConfirm}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
