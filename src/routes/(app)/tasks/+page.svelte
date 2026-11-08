<script lang="ts">
  import { onMount } from "svelte";
  import { tasksStore } from "$lib/state/tasks.svelte";
  import ListCard from "$lib/components/tasks/lists/ListCard.svelte";
  import CreateListModal from "$lib/components/tasks/lists/CreateListModal.svelte";

  let showCreateModal = $state(false);

  onMount(() => {
    tasksStore.loadLists();
  });

  async function handleCreate(name: string) {
    await tasksStore.addList(name);
  }

  async function handleTrash(id: string) {
    await tasksStore.removeListBundle(id);
  }
</script>

<div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
  <!-- Header Tier 1 -->
  <div
    class="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800"
  >
    <div class="flex items-center gap-3">
      <h1
        class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
      >
        Tasks
      </h1>
      <span
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
      >
        {tasksStore.lists.length} lists
      </span>
    </div>

    <div class="flex items-center gap-3">
      <a
        href="/tasks/trash"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
        <span>Trash</span>
      </a>

      <button
        type="button"
        onclick={() => (showCreateModal = true)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded shadow-sm transition-colors"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>New list</span>
      </button>
    </div>
  </div>

  <!-- Body -->
  <div class="mt-6">
    {#if tasksStore.isLoading && tasksStore.lists.length === 0}
      <div class="py-12 text-center text-sm text-slate-500">
        Loading lists...
      </div>
    {:else if tasksStore.lists.length === 0}
      <div class="py-16 text-center">
        <svg
          class="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3
          class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          No task lists yet
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Create your first list to start tracking tasks.
        </p>
        <div class="mt-4">
          <button
            type="button"
            onclick={() => (showCreateModal = true)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded shadow-sm transition-colors"
          >
            + New list
          </button>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each tasksStore.lists as list (list.id)}
          <ListCard {list} onTrash={handleTrash} />
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if showCreateModal}
  <CreateListModal
    onClose={() => (showCreateModal = false)}
    onCreate={handleCreate}
  />
{/if}
