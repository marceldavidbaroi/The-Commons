<script lang="ts">
  import type { TaskRecord } from "$lib/types/tasks";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    task: TaskRecord & { list_name: string; list_deleted_at: string | null };
    onRestore: (id: string) => Promise<void>;
    onDeletePermanent: (id: string) => Promise<void>;
  }

  let { task, onRestore, onDeletePermanent }: Props = $props();

  let showDeleteConfirm = $state(false);
  let isProcessing = $state(false);

  const isParentTrashed = $derived(task.list_deleted_at !== null);

  async function handleRestore() {
    if (isParentTrashed) return;
    isProcessing = true;
    try {
      await onRestore(task.id);
    } finally {
      isProcessing = false;
    }
  }

  async function handleDeletePermanent() {
    isProcessing = true;
    try {
      await onDeletePermanent(task.id);
      showDeleteConfirm = false;
    } finally {
      isProcessing = false;
    }
  }

  function formatTime(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="tasks-table-row">
  <div style="min-width: 0; flex: 1;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        {task.title}
      </span>
      <span class="tasks-badge" style="font-size: 0.625rem;">
        {task.list_name}
      </span>
      {#if task.trash_reason}
        <span class="tasks-badge" style="font-size: 0.625rem; text-transform: capitalize;">
          {task.trash_reason.replace("_", " ")}
        </span>
      {/if}
    </div>
    <span style="font-size: 0.6875rem; color: var(--text-muted);">
      Trashed: {formatTime(task.deleted_at)}
    </span>
  </div>

  <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; margin-left: 1rem;">
    <div style="position: relative;">
      <button
        type="button"
        disabled={isParentTrashed || isProcessing}
        onclick={handleRestore}
        class="tasks-btn tasks-btn-secondary"
        style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
        title={isParentTrashed ? "Restore the list first" : undefined}
      >
        Restore
      </button>
    </div>

    <button
      type="button"
      disabled={isProcessing}
      onclick={() => (showDeleteConfirm = true)}
      class="tasks-btn tasks-btn-danger-ghost"
      style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
    >
      Delete permanently
    </button>
  </div>
</div>

{#if showDeleteConfirm}
  <ConfirmDialog
    title="Delete task permanently?"
    description={`Are you sure you want to permanently delete "${task.title}"? This action cannot be undone.`}
    confirmLabel="Delete permanently"
    isDestructive={true}
    onConfirm={handleDeletePermanent}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
