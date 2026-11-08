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

<div class="tasks-header" style="align-items: flex-start;">
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    <div>
      <a
        href={`/tasks/lists/${listId}`}
        class="tasks-btn tasks-btn-ghost"
        style="padding: 0; font-size: 0.75rem;"
      >
        ← Back to list
      </a>
    </div>

    <h1 class="tasks-title" style="font-size: 1.5rem;">
      {task.title}
    </h1>

    <div style="display: flex; align-items: center; gap: 1rem; padding-top: 0.25rem;">
      <StatusPill status={task.status} onChange={onStatusChange} />
      <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-secondary);">
        <span>Priority:</span>
        <PriorityFlag priority={task.priority} onChange={onPriorityChange} />
      </div>
    </div>
  </div>

  <div class="tasks-header-actions">
    <a
      href={`/tasks/lists/${listId}/tasks/${task.id}/edit`}
      class="tasks-btn tasks-btn-secondary"
    >
      Edit
    </a>
    <button
      type="button"
      onclick={() => (showDeleteConfirm = true)}
      class="tasks-btn tasks-btn-danger-ghost"
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
