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

<div class="tasks-toolbar" style="padding: 0.75rem 0;">
  <SortSelect {sortMode} onSelect={onSortChange} />
  <div style="height: 1rem; width: 1px; background-color: var(--border-subtle); margin: 0 0.25rem;"></div>
  <StatusFilter selected={statusFilters} onChange={onStatusChange} />
  <PriorityFilter selected={priorityFilters} onChange={onPriorityChange} />
</div>
