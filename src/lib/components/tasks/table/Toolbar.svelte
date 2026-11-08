<script lang="ts">
  import SortSelect from "./SortSelect.svelte";
  import StatusFilter from "./StatusFilter.svelte";
  import PriorityFilter from "./PriorityFilter.svelte";
  import type {
    TaskSortMode,
    TaskStatus,
    TaskPriority,
  } from "$lib/types/tasks";

  interface Props {
    sortMode: TaskSortMode;
    statusFilters: TaskStatus[];
    priorityFilters: TaskPriority[];
    onSortChange: (mode: TaskSortMode) => void;
    onStatusChange: (selected: TaskStatus[]) => void;
    onPriorityChange: (selected: TaskPriority[]) => void;
  }

  let {
    sortMode,
    statusFilters,
    priorityFilters,
    onSortChange,
    onStatusChange,
    onPriorityChange,
  }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2 py-3">
  <SortSelect {sortMode} onSelect={onSortChange} />
  <div class="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
  <StatusFilter selected={statusFilters} onChange={onStatusChange} />
  <PriorityFilter selected={priorityFilters} onChange={onPriorityChange} />
</div>
