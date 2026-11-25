<script lang="ts">
  import SortSelect from "./SortSelect.svelte";
  import StatusFilter from "./StatusFilter.svelte";
  import PriorityFilter from "./PriorityFilter.svelte";
  import type {
    TaskSortMode,
    TaskStatus,
    TaskPriority,
    TaskScopeFilter,
  } from "$lib/types/tasks";

  interface Props {
    sortMode: TaskSortMode;
    statusFilters: TaskStatus[];
    priorityFilters: TaskPriority[];
    hasSubLists?: boolean;
    scopeFilter?: TaskScopeFilter;
    onSortChange: (mode: TaskSortMode) => void;
    onStatusChange: (selected: TaskStatus[]) => void;
    onPriorityChange: (selected: TaskPriority[]) => void;
    onScopeChange?: (scope: TaskScopeFilter) => void;
  }

  let {
    sortMode,
    statusFilters,
    priorityFilters,
    hasSubLists = false,
    scopeFilter = "all",
    onSortChange,
    onStatusChange,
    onPriorityChange,
    onScopeChange,
  }: Props = $props();
</script>

<div class="tasks-toolbar" style="padding: 0.75rem 0; flex-wrap: wrap;">
  <SortSelect {sortMode} onSelect={onSortChange} />
  <div style="height: 1rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>
  <StatusFilter selected={statusFilters} onChange={onStatusChange} />
  <PriorityFilter selected={priorityFilters} onChange={onPriorityChange} />

  {#if hasSubLists && onScopeChange}
    <div style="height: 1rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>
    <div style="display: inline-flex; align-items: center; gap: 0.25rem;" role="group" aria-label="Task scope">
      {#each [
        { id: "all", label: "All" },
        { id: "own", label: "This list" },
        { id: "sublists", label: "Sub-lists" },
      ] as opt (opt.id)}
        <button
          type="button"
          onclick={() => onScopeChange(opt.id as TaskScopeFilter)}
          class="tasks-btn {scopeFilter === opt.id ? 'tasks-btn-primary' : 'tasks-btn-ghost'}"
          style="padding: 0.25rem 0.625rem; font-size: 0.8125rem;"
        >
          {opt.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
