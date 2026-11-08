<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    list: ListRecord;
    onRestore: (id: string) => Promise<void>;
    onDeletePermanent: (id: string) => Promise<void>;
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

<div
  class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3 text-xs"
>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <span class="font-medium text-slate-800 dark:text-slate-200 truncate"
        >{list.name}</span
      >
      <span
        class="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500"
      >
        List + tasks bundle
      </span>
    </div>
    <span class="text-[11px] text-slate-400"
      >Trashed: {formatTime(list.deleted_at)}</span
    >
  </div>

  <div class="flex items-center gap-2 shrink-0 ml-4">
    <button
      type="button"
      disabled={isProcessing}
      onclick={handleRestore}
      class="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
    >
      Restore
    </button>
    <button
      type="button"
      disabled={isProcessing}
      onclick={() => (showDeleteConfirm = true)}
      class="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
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
