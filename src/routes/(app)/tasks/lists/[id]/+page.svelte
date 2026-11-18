<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto, replaceState } from "$app/navigation";
  import { tasksStore } from "$lib/state/tasks.svelte";
  import type {
    TaskSortMode,
    TaskStatus,
    TaskPriority,
  } from "$lib/types/tasks";
  import ListHeader from "$lib/components/tasks/table/ListHeader.svelte";
  import Toolbar from "$lib/components/tasks/table/Toolbar.svelte";
  import TaskTable from "$lib/components/tasks/table/TaskTable.svelte";
  import BulkActionBar from "$lib/components/tasks/table/BulkActionBar.svelte";

  const listId = $derived(page.params.id as string);

  function readUrlFilters(): {
    status: TaskStatus[];
    priority: TaskPriority[];
  } {
    const statusParam = page.url.searchParams.get("status");
    const priorityParam = page.url.searchParams.get("priority");

    const status = statusParam
      ? (statusParam.split(",").filter(Boolean) as TaskStatus[])
      : [];
    const priority = priorityParam
      ? (priorityParam.split(",").filter(Boolean) as TaskPriority[])
      : [];
    return { status, priority };
  }

  function syncFiltersToUrl(status: TaskStatus[], priority: TaskPriority[]) {
    const url = new URL(page.url);
    if (status.length > 0) {
      url.searchParams.set("status", status.join(","));
    } else {
      url.searchParams.delete("status");
    }

    if (priority.length > 0) {
      url.searchParams.set("priority", priority.join(","));
    } else {
      url.searchParams.delete("priority");
    }
    replaceState(url.toString(), {});
  }

  onMount(() => {
    const { status, priority } = readUrlFilters();
    tasksStore.initList(listId, status, priority);
  });

  function handleSortChange(mode: TaskSortMode) {
    tasksStore.setSortMode(mode);
  }

  function handleStatusChange(selected: TaskStatus[]) {
    syncFiltersToUrl(selected, tasksStore.priorityFilters);
    tasksStore.applyFilters(selected, tasksStore.priorityFilters);
  }

  function handlePriorityChange(selected: TaskPriority[]) {
    syncFiltersToUrl(tasksStore.statusFilters, selected);
    tasksStore.applyFilters(tasksStore.statusFilters, selected);
  }

  function handleClearFilters() {
    syncFiltersToUrl([], []);
    tasksStore.applyFilters([], []);
  }

  const hasActiveFilters = $derived(
    tasksStore.statusFilters.length > 0 ||
      tasksStore.priorityFilters.length > 0,
  );
</script>

<svelte:head>
  <title>{tasksStore.currentList?.name ?? "Tasks"} — The Commons</title>
</svelte:head>

<div class="tasks-container">
  {#if tasksStore.currentList}
    <ListHeader
      list={tasksStore.currentList}
      totalFiltered={tasksStore.totalFiltered}
      totalLive={tasksStore.totalLive}
      {hasActiveFilters}
      onRename={(name) => tasksStore.renameList(listId, name)}
      onDelete={async () => {
        await tasksStore.removeListBundle(listId);
        goto("/tasks");
      }}
    />

    <Toolbar
      sortMode={tasksStore.currentList.sort_mode}
      statusFilters={tasksStore.statusFilters}
      priorityFilters={tasksStore.priorityFilters}
      onSortChange={handleSortChange}
      onStatusChange={handleStatusChange}
      onPriorityChange={handlePriorityChange}
    />

    <div style="display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
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
          onclick={() => tasksStore.setDueTab(tab.id as "all" | "today" | "yesterday" | "later" | "due" | "no_due")}
          class="tasks-btn {tasksStore.dueTab === tab.id ? 'tasks-btn-primary' : 'tasks-btn-ghost'}"
          style="padding: 0.3125rem 0.75rem; font-size: 0.8125rem;"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <TaskTable
      tasks={tasksStore.tasks}
      {listId}
      sortMode={tasksStore.currentList.sort_mode}
      nextCursor={tasksStore.nextCursor}
      isLoadingMore={tasksStore.isLoadingMore}
      isFiltered={hasActiveFilters}
      selectedIds={tasksStore.selectedTaskIds}
      onToggleSelect={tasksStore.toggleTaskSelection}
      onToggleSelectAll={tasksStore.toggleSelectAllLoaded}
      onStatusChange={tasksStore.patchTaskStatus}
      onPriorityChange={tasksStore.patchTaskPriority}
      onDueDateChange={tasksStore.patchTaskDueDate}
      onLoadMore={tasksStore.loadMore}
      onClearFilters={handleClearFilters}
      onReorder={tasksStore.reorderTasksLocally}
    />

    {#if tasksStore.selectedTaskIds.length > 0}
      <BulkActionBar
        selectedCount={tasksStore.selectedTaskIds.length}
        onClear={tasksStore.clearSelection}
        onTrash={tasksStore.bulkTrashSelected}
      />
    {/if}
  {:else if tasksStore.isLoading}
    <div class="tasks-empty">
      <p>Loading list...</p>
    </div>
  {:else}
    <div class="tasks-empty">
      <p>List not found.</p>
    </div>
  {/if}
</div>
