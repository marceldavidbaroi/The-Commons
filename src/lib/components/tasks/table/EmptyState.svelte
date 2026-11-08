<script lang="ts">
  interface Props {
    isFiltered: boolean;
    listId: string;
    onClearFilters: () => void;
  }

  let { isFiltered, listId, onClearFilters }: Props = $props();
</script>

<div class="py-16 text-center">
  <svg
    class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700"
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

  {#if isFiltered}
    <h3 class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
      No matching tasks
    </h3>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
      No tasks match the active filters.
    </p>
    <div class="mt-4">
      <button
        type="button"
        onclick={onClearFilters}
        class="text-xs font-medium text-primary hover:underline"
      >
        Clear filters
      </button>
    </div>
  {:else}
    <h3 class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
      No tasks in this list
    </h3>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
      Add your first task to get started.
    </p>
    <div class="mt-4">
      <a
        href={`/tasks/lists/${listId}/tasks/new`}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded shadow-sm transition-colors"
      >
        + New task
      </a>
    </div>
  {/if}
</div>
