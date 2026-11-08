<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    list: ListRecord;
    onTrash: (id: string) => void;
  }

  let { list, onTrash }: Props = $props();

  let showDeleteConfirm = $state(false);
</script>

<div
  class="group relative flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
>
  <div class="flex items-start justify-between gap-2">
    <a
      href={`/tasks/lists/${list.id}`}
      class="flex-1 font-medium text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
    >
      <span class="text-sm font-semibold">{list.name}</span>
    </a>
    <button
      type="button"
      onclick={() => (showDeleteConfirm = true)}
      class="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
      title="Move to trash"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  </div>

  <div
    class="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
  >
    <div class="flex items-center gap-1.5">
      <span
        class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
      >
        {list.active_tasks_count} active
      </span>
      <span>•</span>
      <span>{list.live_tasks_count} total</span>
    </div>
    <span class="capitalize text-[11px] text-slate-400">{list.sort_mode}</span>
  </div>
</div>

{#if showDeleteConfirm}
  <ConfirmDialog
    title="Move list to trash?"
    description={`Moving "${list.name}" to trash will also move all ${list.live_tasks_count} tasks within it to trash as a bundle.`}
    confirmLabel="Move to trash"
    isDestructive={true}
    onConfirm={() => {
      showDeleteConfirm = false;
      onTrash(list.id);
    }}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
