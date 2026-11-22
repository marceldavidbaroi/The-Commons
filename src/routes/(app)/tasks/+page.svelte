<script lang="ts">
  import { onMount } from "svelte";
  import { tasksStore } from "$lib/state/tasks.svelte";
  import * as tasksService from "$lib/services/tasks-service";
  import type { DueTab, DueTabCursor, DueTabTask } from "$lib/services/tasks-service";
  import type { TaskPriority, TaskStatus } from "$lib/types/tasks";
  import ListCard from "$lib/components/tasks/lists/ListCard.svelte";
  import CreateListModal from "$lib/components/tasks/lists/CreateListModal.svelte";
  import PriorityFlag from "$lib/components/tasks/shared/PriorityFlag.svelte";
  import StatusPill from "$lib/components/tasks/shared/StatusPill.svelte";
  import StatusFilter from "$lib/components/tasks/table/StatusFilter.svelte";
  import PriorityFilter from "$lib/components/tasks/table/PriorityFilter.svelte";

  let showCreateModal = $state(false);
  let activeTab = $state<DueTab>("all");
  let statusFilters = $state<TaskStatus[]>([]);
  let priorityFilters = $state<TaskPriority[]>([]);
  let tabTasks = $state<DueTabTask[]>([]);
  let tabCursor = $state<DueTabCursor | null>(null);
  let isLoadingTab = $state(false);
  let isLoadingMoreTab = $state(false);

  async function loadDueTab(tab: DueTab) {
    activeTab = tab;
    isLoadingTab = true;
    try {
      const res = await tasksService.fetchTasksByDueTab(
        tab,
        null,
        20,
        statusFilters,
        priorityFilters,
      );
      if (activeTab === tab) {
        tabTasks = res.items;
        tabCursor = res.nextCursor;
      }
    } finally {
      if (activeTab === tab) {
        isLoadingTab = false;
      }
    }
  }

  async function loadMoreDueTab() {
    if (!tabCursor || isLoadingMoreTab) return;
    isLoadingMoreTab = true;
    const tab = activeTab;
    try {
      const res = await tasksService.fetchTasksByDueTab(
        tab,
        tabCursor,
        20,
        statusFilters,
        priorityFilters,
      );
      if (activeTab === tab) {
        tabTasks = [...tabTasks, ...res.items];
        tabCursor = res.nextCursor;
      }
    } finally {
      isLoadingMoreTab = false;
    }
  }

  function handleStatusFilterChange(selected: TaskStatus[]) {
    statusFilters = selected;
    loadDueTab(activeTab);
  }

  function handlePriorityFilterChange(selected: TaskPriority[]) {
    priorityFilters = selected;
    loadDueTab(activeTab);
  }

  async function handleTabStatusChange(taskId: number, status: TaskStatus) {
    tabTasks = tabTasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    await tasksService.updateTaskStatus(taskId, status);
  }

  async function handleTabPriorityChange(taskId: number, priority: TaskPriority) {
    tabTasks = tabTasks.map((t) => (t.id === taskId ? { ...t, priority } : t));
    await tasksService.updateTaskPriority(taskId, priority);
  }

  onMount(() => {
    tasksStore.loadLists();
    loadDueTab("all");
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
      <div class="tasks-grid" aria-busy="true" aria-label="Loading lists">
        {#each Array(3) as _, i (i)}
          <div class="tasks-skeleton-card">
            <div class="tasks-skeleton-line" style="width: 55%; height: 1rem;"></div>
            <div class="tasks-skeleton-line" style="width: 35%; height: 0.75rem; margin-top: 0.625rem;"></div>
          </div>
        {/each}
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

  <!-- Section 2: Today / Tomorrow / Due -->
  <section style="margin-top: 2rem;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        {#each [
          { id: "all", label: "All" },
          { id: "today", label: "Today" },
          { id: "yesterday", label: "Yesterday" },
          { id: "later", label: "Later" },
          { id: "due", label: "Due" },
          { id: "no_due", label: "No due" },
        ] as tab (tab.id)}
          <button
            type="button"
            onclick={() => loadDueTab(tab.id as DueTab)}
            class="tasks-btn {activeTab === tab.id ? 'tasks-btn-primary' : 'tasks-btn-ghost'}"
            style="padding: 0.375rem 0.75rem; font-size: 0.875rem;"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <StatusFilter selected={statusFilters} onChange={handleStatusFilterChange} />
        <PriorityFilter selected={priorityFilters} onChange={handlePriorityFilterChange} />
      </div>
    </div>

    {#if isLoadingTab}
      <div class="tasks-table-wrapper" aria-busy="true" aria-label="Loading tasks">
        <div class="tasks-table-body">
          {#each Array(5) as _, i (i)}
            <div class="tasks-table-row">
              <div style="display: flex; align-items: center; gap: 0.625rem; flex: 1;">
                <div class="tasks-skeleton-line" style="width: 1rem; height: 1rem; border-radius: 0.25rem;"></div>
                <div class="tasks-skeleton-line" style="width: {45 + (i % 3) * 15}%; height: 0.875rem;"></div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-left: 1rem;">
                <div class="tasks-skeleton-line" style="width: 4.5rem; height: 1.25rem; border-radius: 9999px;"></div>
                <div class="tasks-skeleton-line" style="width: 5rem; height: 1.375rem; border-radius: 9999px;"></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if tabTasks.length === 0}
      <div class="tasks-empty">
        <p style="margin: 0; font-size: 0.875rem;">
          No {activeTab === "due" ? "overdue" : activeTab} tasks.
        </p>
      </div>
    {:else}
      <div class="tasks-table-wrapper" style="overflow: visible;">
        <div class="tasks-table-body" role="list">
          {#each tabTasks as task (task.id)}
            <div class="tasks-table-row" role="listitem">
              <div style="display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1;">
                <PriorityFlag
                  priority={task.priority}
                  onChange={(p) => handleTabPriorityChange(task.id, p)}
                />
                <a
                  href={`/tasks/lists/${task.list_id}/tasks/${task.id}`}
                  style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: var(--text-primary); text-decoration: none; flex: 1;"
                >
                  {task.title}
                </a>
              </div>

              <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; margin-left: 1rem;">
                <a
                  href={`/tasks/lists/${task.list_id}`}
                  class="tasks-badge"
                  style="text-decoration: none;"
                >
                  {task.list_name}
                </a>
                <StatusPill
                  status={task.status}
                  onChange={(s) => handleTabStatusChange(task.id, s)}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>

      {#if tabCursor}
        <div style="display: flex; justify-content: center; margin-top: 0.75rem;">
          <button
            type="button"
            onclick={loadMoreDueTab}
            disabled={isLoadingMoreTab}
            class="tasks-btn tasks-btn-secondary"
          >
            {isLoadingMoreTab ? "Loading..." : "Load more"}
          </button>
        </div>
      {/if}
    {/if}
  </section>
</div>

{#if showCreateModal}
  <CreateListModal
    onClose={() => (showCreateModal = false)}
    onCreate={handleCreate}
  />
{/if}

<style>
  .tasks-skeleton-card {
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border-subtle);
    background-color: var(--bg-surface, transparent);
  }

  .tasks-skeleton-line {
    border-radius: 0.25rem;
    background-color: var(--border-subtle);
    animation: tasks-skeleton-pulse 1.5s ease-in-out infinite;
  }

  @keyframes tasks-skeleton-pulse {
    0%, 100% {
      opacity: 0.45;
    }
    50% {
      opacity: 0.85;
    }
  }
</style>
