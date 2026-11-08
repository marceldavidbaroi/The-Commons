<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    list: ListRecord;
    onRestore: (id: number | string) => Promise<void>;
    onDeletePermanent: (id: number | string) => Promise<void>;
  }

  let { list, onRestore, onDeletePermanent }: Props = $props();

  let showDeleteConfirm = $state(false);
  let isProcessing = $state(false);

  async function handleRestore() {
    isProcessing = true;
    try {
      await onRestore(list.id);
    } finally {
      isProcessing = false;
    }
  }

  async function handleDeletePermanent() {
    isProcessing = true;
    try {
      await onDeletePermanent(list.id);
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
        {list.name}
      </span>
      <span class="tasks-badge" style="font-size: 0.625rem;">
        List + tasks bundle
      </span>
    </div>
    <span style="font-size: 0.6875rem; color: var(--text-muted);">
      Trashed: {formatTime(list.deleted_at)}
    </span>
  </div>

  <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; margin-left: 1rem;">
    <button
      type="button"
      disabled={isProcessing}
      onclick={handleRestore}
      class="tasks-btn tasks-btn-secondary"
      style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
    >
      Restore
    </button>
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
    title="Delete list permanently?"
    description={`Are you sure you want to permanently delete "${list.name}" and all of its tasks? This action cannot be undone.`}
    confirmLabel="Delete permanently"
    isDestructive={true}
    onConfirm={handleDeletePermanent}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
