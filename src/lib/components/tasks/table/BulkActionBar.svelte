<script lang="ts">
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    selectedCount: number;
    onClear: () => void;
    onTrash: () => Promise<void>;
  }

  let { selectedCount, onClear, onTrash }: Props = $props();

  let showConfirm = $state(false);
  let isSubmitting = $state(false);

  async function handleConfirm() {
    isSubmitting = true;
    try {
      await onTrash();
      showConfirm = false;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="tasks-bulk-bar">
  <span style="font-weight: 600;">
    {selectedCount} selected
  </span>

  <div style="height: 1rem; width: 1px; background-color: var(--border-subtle);"></div>

  <button
    type="button"
    onclick={() => (showConfirm = true)}
    class="tasks-btn tasks-btn-danger"
    style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
  >
    Move to trash
  </button>

  <button
    type="button"
    onclick={onClear}
    class="tasks-btn tasks-btn-ghost"
    style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
  >
    Clear
  </button>
</div>

{#if showConfirm}
  <ConfirmDialog
    title="Move selected tasks to trash?"
    description={`Are you sure you want to move ${selectedCount} tasks to trash?`}
    confirmLabel={isSubmitting ? "Moving..." : "Move to trash"}
    isDestructive={true}
    onConfirm={handleConfirm}
    onCancel={() => (showConfirm = false)}
  />
{/if}
