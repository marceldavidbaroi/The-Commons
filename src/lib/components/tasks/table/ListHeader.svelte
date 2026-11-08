<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";

  interface Props {
    list: ListRecord;
    totalFiltered: number;
    totalLive: number;
    hasActiveFilters: boolean;
  }

  let { list, totalFiltered, totalLive, hasActiveFilters }: Props = $props();
</script>

<div
  class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800"
>
  <div class="flex items-center gap-3">
    <a
      href="/tasks"
      class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title="Back to lists"
    >
      <svg
        class="w-5 h-5"
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
      <div class="flex items-center gap-2">
        <h1
          class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          {list.name}
        </h1>
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        >
          {#if hasActiveFilters}
            {totalFiltered} of {totalLive} tasks
          {:else}
            {totalLive} tasks
          {/if}
        </span>
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <a
      href={`/tasks/lists/${list.id}/tasks/new`}
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
      <span>New task</span>
    </a>
  </div>
</div>
