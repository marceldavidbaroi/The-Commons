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

<header class="tasks-header">
  <div class="tasks-header-left">
    <a
      href="/tasks"
      class="tasks-icon-btn"
      title="Back to lists"
    >
      <svg
        style="width: 1.25rem; height: 1.25rem;"
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

    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <h1 class="tasks-title">
        {list.name}
      </h1>
      <span class="tasks-badge">
        {#if hasActiveFilters}
          {totalFiltered} of {totalLive} tasks
        {:else}
          {totalLive} tasks
        {/if}
      </span>
    </div>
  </div>

  <div class="tasks-header-actions">
    <a
      href={`/tasks/lists/${list.id}/tasks/new`}
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
      <span>New task</span>
    </a>
  </div>
</header>
