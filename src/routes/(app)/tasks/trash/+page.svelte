<script lang="ts">
  import { onMount } from "svelte";
  import type { ListRecord, TaskRecord } from "$lib/types/tasks";
  import TrashedListRow from "$lib/components/tasks/trash/TrashedListRow.svelte";
  import TrashedTaskRow from "$lib/components/tasks/trash/TrashedTaskRow.svelte";
  import ConfirmDialog from "$lib/components/tasks/shared/ConfirmDialog.svelte";
  import * as tasksService from "$lib/services/tasks-service";

  let trashedLists = $state<ListRecord[]>([]);
  let trashedTasks = $state<
    Array<TaskRecord & { list_name: string; list_deleted_at: string | null }>
  >([]);
  let isLoading = $state(true);
  let showEmptyConfirm = $state(false);
  let isEmpting = $state(false);

  async function loadTrash() {
    isLoading = true;
    try {
      const res = await tasksService.fetchTrash();
      trashedLists = res.lists;
      trashedTasks = res.tasks;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadTrash();
  });

  async function handleRestoreList(id: string) {
    await tasksService.restoreListBundle(id);
    await loadTrash();
  }

  async function handleDeleteListPermanent(id: string) {
    await tasksService.deleteListPermanent(id);
    await loadTrash();
  }

  async function handleRestoreTask(id: string) {
    await tasksService.restoreTask(id);
    await loadTrash();
  }

  async function handleDeleteTaskPermanent(id: string) {
    await tasksService.deleteTaskPermanent(id);
    await loadTrash();
  }

  async function handleEmptyTrash() {
    isEmpting = true;
    try {
      await tasksService.emptyTrash();
      showEmptyConfirm = false;
      await loadTrash();
    } finally {
      isEmpting = false;
    }
  }

  const hasItems = $derived(trashedLists.length > 0 || trashedTasks.length > 0);
</script>

<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
  <div
    class="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800"
  >
    <div class="flex items-center gap-3">
      <a
        href="/tasks"
        class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Back to tasks"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </a>

      <div>
        <h1
          class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          Trash
        </h1>
        <p class="text-xs text-slate-500">
          Deleted lists and tasks are kept here until permanently deleted.
        </p>
      </div>
    </div>

    {#if hasItems}
      <button
        type="button"
        onclick={() => (showEmptyConfirm = true)}
        class="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded transition-colors"
      >
        Empty trash
      </button>
    {/if}
  </div>

  <div class="mt-6 space-y-8">
    {#if isLoading}
      <div class="py-12 text-center text-sm text-slate-500">
        Loading trash...
      </div>
    {:else if !hasItems}
      <div class="py-16 text-center text-sm text-slate-400">
        Trash is empty.
      </div>
    {:else}
      <!-- Trashed Lists Section -->
      {#if trashedLists.length > 0}
        <div>
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2"
          >
            Lists ({trashedLists.length})
          </h2>
          <div
            class="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden"
          >
            {#each trashedLists as list (list.id)}
              <TrashedListRow
                {list}
                onRestore={handleRestoreList}
                onDeletePermanent={handleDeleteListPermanent}
              />
            {/each}
          </div>
        </div>
      {/if}

      <!-- Trashed Tasks Section -->
      {#if trashedTasks.length > 0}
        <div>
          <h2
            class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2"
          >
            Tasks ({trashedTasks.length})
          </h2>
          <div
            class="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden"
          >
            {#each trashedTasks as task (task.id)}
              <TrashedTaskRow
                {task}
                onRestore={handleRestoreTask}
                onDeletePermanent={handleDeleteTaskPermanent}
              />
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if showEmptyConfirm}
  <ConfirmDialog
    title="Empty trash?"
    description="This will permanently delete all trashed lists and tasks. This action cannot be undone."
    confirmLabel={isEmpting ? "Emptying..." : "Empty trash"}
    isDestructive={true}
    onConfirm={handleEmptyTrash}
    onCancel={() => (showEmptyConfirm = false)}
  />
{/if}
