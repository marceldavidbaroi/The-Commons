<script lang="ts">
  import type { TaskBacklink } from "$lib/types/tasks";

  interface Props {
    backlinks: TaskBacklink[];
  }

  let { backlinks }: Props = $props();
</script>

<div style="margin-top: 2rem; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem;">
  <h3
    style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.75rem;"
  >
    Backlinks ({backlinks.length})
  </h3>

  {#if backlinks.length === 0}
    <p style="font-size: 0.8125rem; color: var(--text-muted);">No other tasks link to this task.</p>
  {:else}
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      {#each backlinks as link}
        <a
          href={`/tasks/lists/${link.list_id}/tasks/${link.source_task_id}`}
          class="tasks-table-row"
          style="border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-decoration: none;"
        >
          <span
            style="font-size: 0.8125rem; font-weight: 500; color: var(--text-primary);"
          >
            # {link.source_task_title}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            {link.list_name}
          </span>
        </a>
      {/each}
    </div>
  {/if}
</div>
