<script lang="ts">
  import type { TaskBacklink } from "$lib/types/tasks";

  interface Props {
    backlinks: TaskBacklink[];
  }

  let { backlinks }: Props = $props();
</script>

<div class="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
  <h3
    class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3"
  >
    Backlinks ({backlinks.length})
  </h3>

  {#if backlinks.length === 0}
    <p class="text-xs text-slate-400">No other tasks link to this task.</p>
  {:else}
    <div class="space-y-2">
      {#each backlinks as link}
        <a
          href={`/tasks/lists/${link.list_id}/tasks/${link.source_task_id}`}
          class="flex items-center justify-between p-2.5 rounded border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
        >
          <span
            class="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-primary"
          >
            # {link.source_task_title}
          </span>
          <span class="text-[11px] text-slate-400">
            {link.list_name}
          </span>
        </a>
      {/each}
    </div>
  {/if}
</div>
