<script lang="ts">
  import type {
    TaskRecord,
    TaskSortMode,
    TaskStatus,
    TaskPriority,
  } from "$lib/types/tasks";
  import TaskRow from "./TaskRow.svelte";
  import LoadMoreButton from "./LoadMoreButton.svelte";
  import EmptyState from "./EmptyState.svelte";
  import * as tasksService from "$lib/services/tasks-service";

  interface Props {
    tasks: TaskRecord[];
    listId: string;
    sortMode: TaskSortMode;
    nextCursor: string | null;
    isLoadingMore: boolean;
    isFiltered: boolean;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onStatusChange: (id: string, s: TaskStatus) => void;
    onPriorityChange: (id: string, p: TaskPriority) => void;
    onLoadMore: () => void;
    onClearFilters: () => void;
    onReorder: (tasks: TaskRecord[]) => void;
  }

  let {
    tasks,
    listId,
    sortMode,
    nextCursor,
    isLoadingMore,
    isFiltered,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onStatusChange,
    onPriorityChange,
    onLoadMore,
    onClearFilters,
    onReorder,
  }: Props = $props();

  let draggedId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, id: string) {
    if (sortMode !== "manual") return;
    draggedId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    }
  }

  function handleDragOver(e: DragEvent, id: string) {
    if (sortMode !== "manual" || draggedId === id) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: DragEvent, targetId: string) {
    if (sortMode !== "manual" || !draggedId || draggedId === targetId) return;
    e.preventDefault();

    const fromIndex = tasks.findIndex((t) => t.id === draggedId);
    const toIndex = tasks.findIndex((t) => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered);

    // Compute fractional position
    let newPosition = 0;
    if (toIndex === 0) {
      newPosition = (reordered[1]?.position || 2) / 2;
    } else if (toIndex === reordered.length - 1) {
      newPosition = (reordered[reordered.length - 2]?.position || 0) + 1;
    } else {
      const prev = reordered[toIndex - 1].position;
      const next = reordered[toIndex + 1].position;
      newPosition = (prev + next) / 2;
    }

    moved.position = newPosition;
    draggedId = null;
    await tasksService.updateTaskPosition(moved.id, newPosition);
  }

  const allSelected = $derived(
    tasks.length > 0 && selectedIds.length === tasks.length,
  );
</script>

<div
  class="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
>
  {#if tasks.length === 0}
    <EmptyState {isFiltered} {listId} {onClearFilters} />
  {:else}
    <!-- Table Header Row -->
    <div
      class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-3 py-2 text-[11px] font-semibold text-slate-500"
    >
      <div class="flex items-center gap-2.5">
        {#if sortMode === "manual"}
          <span class="w-3"></span>
        {/if}
        <input
          type="checkbox"
          checked={allSelected}
          onchange={onToggleSelectAll}
          class="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-3.5 w-3.5"
          title="Select all loaded"
        />
        <span>Title</span>
      </div>
      <span>Status</span>
    </div>

    <!-- Table Rows -->
    <div class="divide-y divide-slate-100 dark:divide-slate-800/60">
      {#each tasks as task (task.id)}
        <TaskRow
          {task}
          {listId}
          {sortMode}
          isSelected={selectedIds.includes(task.id)}
          {onToggleSelect}
          {onStatusChange}
          {onPriorityChange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      {/each}
    </div>

    {#if nextCursor}
      <LoadMoreButton isLoading={isLoadingMore} onClick={onLoadMore} />
    {/if}
  {/if}
</div>
