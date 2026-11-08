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

<div
  class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 shadow-xl"
>
  <span class="text-xs font-medium">
    {selectedCount} selected
  </span>

  <div class="h-4 w-px bg-slate-700 dark:bg-slate-300"></div>

  <button
    type="button"
    onclick={() => (showConfirm = true)}
    class="text-xs font-medium text-rose-400 dark:text-rose-600 hover:opacity-80 transition-opacity"
  >
    Move to trash
  </button>

  <button
    type="button"
    onclick={onClear}
    class="text-xs text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 transition-colors"
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
