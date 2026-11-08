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

  async function handleTrash(id: number | string) {
    await tasksStore.removeListBundle(id);
  }
</script>

<svelte:head>
  <title>Tasks — The Commons</title>
</svelte:head>

<div class="tasks-container">
  <!-- Header Tier 1 -->
  <header class="tasks-header">
    <div class="tasks-header-left">
      <h1 class="tasks-title">Tasks</h1>
      <span class="tasks-badge">
        {tasksStore.lists.length} {tasksStore.lists.length === 1 ? "list" : "lists"}
      </span>
    </div>

    <div class="tasks-header-actions">
      <a href="/tasks/trash" class="tasks-btn tasks-btn-ghost">
        <svg
          style="width: 1rem; height: 1rem;"
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
        class="tasks-btn tasks-btn-primary"
      >
        <svg
          style="width: 0.875rem; height: 0.875rem;"
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
  </header>

  <!-- Body -->
  <div>
    {#if tasksStore.isLoading && tasksStore.lists.length === 0}
      <div class="tasks-empty">
        <p>Loading lists...</p>
      </div>
    {:else if tasksStore.lists.length === 0}
      <div class="tasks-empty">
        <svg
          style="width: 3rem; height: 3rem; opacity: 0.5;"
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
        <div class="tasks-empty-title">No task lists yet</div>
        <p style="font-size: 0.8125rem; margin: 0;">Create your first list to start tracking tasks.</p>
        <div style="margin-top: 0.75rem;">
          <button
            type="button"
            onclick={() => (showCreateModal = true)}
            class="tasks-btn tasks-btn-primary"
          >
            + New list
          </button>
        </div>
      </div>
    {:else}
      <div class="tasks-grid">
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
