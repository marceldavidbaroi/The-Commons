<script lang="ts">
  interface Props {
    isFiltered: boolean;
    listId: number | string;
    onClearFilters: () => void;
  }

  let { isFiltered, listId, onClearFilters }: Props = $props();
</script>

<div class="tasks-empty">
  <svg
    style="width: 2.5rem; height: 2.5rem; opacity: 0.5;"
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
    <div class="tasks-empty-title">
      No matching tasks
    </div>
    <p style="font-size: 0.8125rem; margin: 0;">
      No tasks match the active filters.
    </p>
    <div style="margin-top: 0.75rem;">
      <button
        type="button"
        onclick={onClearFilters}
        class="tasks-btn tasks-btn-ghost"
        style="color: var(--primary);"
      >
        Clear filters
      </button>
    </div>
  {:else}
    <div class="tasks-empty-title">
      No tasks in this list
    </div>
    <p style="font-size: 0.8125rem; margin: 0;">
      Add your first task to get started.
    </p>
    <div style="margin-top: 0.75rem;">
      <a
        href={`/tasks/lists/${listId}/tasks/new`}
        class="tasks-btn tasks-btn-primary"
      >
        + New task
      </a>
    </div>
  {/if}
</div>
