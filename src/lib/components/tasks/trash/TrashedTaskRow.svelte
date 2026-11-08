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

<div
  class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3 text-xs"
>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <span class="font-medium text-slate-800 dark:text-slate-200 truncate"
        >{task.title}</span
      >
      <span
        class="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500"
      >
        {task.list_name}
      </span>
      {#if task.trash_reason}
        <span
          class="rounded bg-slate-50 dark:bg-slate-900 px-1 py-0.5 text-[10px] text-slate-400 capitalize"
        >
          {task.trash_reason.replace("_", " ")}
        </span>
      {/if}
    </div>
    <span class="text-[11px] text-slate-400"
      >Trashed: {formatTime(task.deleted_at)}</span
    >
  </div>

  <div class="flex items-center gap-2 shrink-0 ml-4">
    <div class="relative group/btn">
      <button
        type="button"
        disabled={isParentTrashed || isProcessing}
        onclick={handleRestore}
        class="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
      >
        Restore
      </button>

      {#if isParentTrashed}
        <div
          class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/btn:block z-50 whitespace-nowrap rounded bg-slate-900 text-white px-2 py-1 text-[10px]"
        >
          Restore the list first
        </div>
      {/if}
    </div>

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
    title="Delete task permanently?"
    description={`Are you sure you want to permanently delete "${task.title}"? This action cannot be undone.`}
    confirmLabel="Delete permanently"
    isDestructive={true}
    onConfirm={handleDeletePermanent}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
