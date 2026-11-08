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

  async function handleRestoreList(id: number | string) {
    await tasksService.restoreListBundle(id);
    await loadTrash();
  }

  async function handleDeleteListPermanent(id: number | string) {
    await tasksService.deleteListPermanent(id);
    await loadTrash();
  }

  async function handleRestoreTask(id: number | string) {
    await tasksService.restoreTask(id);
    await loadTrash();
  }

  async function handleDeleteTaskPermanent(id: number | string) {
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

<svelte:head>
  <title>Trash — Tasks — The Commons</title>
</svelte:head>

<div class="tasks-container" style="max-width: 900px;">
  <header class="tasks-header">
    <div class="tasks-header-left">
      <a
        href="/tasks"
        class="tasks-icon-btn"
        title="Back to tasks"
      >
        <svg
          style="width: 1.25rem; height: 1.25rem;"
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
        <h1 class="tasks-title">Trash</h1>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">
          Deleted lists and tasks are kept here until permanently deleted.
        </p>
      </div>
    </div>

    {#if hasItems}
      <button
        type="button"
        onclick={() => (showEmptyConfirm = true)}
        class="tasks-btn tasks-btn-danger"
      >
        Empty trash
      </button>
    {/if}
  </header>

  <div style="display: flex; flex-direction: column; gap: 2rem;">
    {#if isLoading}
      <div class="tasks-empty"><p>Loading trash...</p></div>
    {:else if !hasItems}
      <div class="tasks-empty"><p>Trash is empty.</p></div>
    {:else}
      <!-- Trashed Lists Section -->
      {#if trashedLists.length > 0}
        <div>
          <h2
            style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.5rem;"
          >
            Lists ({trashedLists.length})
          </h2>
          <div class="tasks-table-wrapper">
            <div class="tasks-table-body">
              {#each trashedLists as list (list.id)}
                <TrashedListRow
                  {list}
                  onRestore={handleRestoreList}
                  onDeletePermanent={handleDeleteListPermanent}
                />
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Trashed Tasks Section -->
      {#if trashedTasks.length > 0}
        <div>
          <h2
            style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.5rem;"
          >
            Tasks ({trashedTasks.length})
          </h2>
          <div class="tasks-table-wrapper">
            <div class="tasks-table-body">
              {#each trashedTasks as task (task.id)}
                <TrashedTaskRow
                  {task}
                  onRestore={handleRestoreTask}
                  onDeletePermanent={handleDeleteTaskPermanent}
                />
              {/each}
            </div>
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
