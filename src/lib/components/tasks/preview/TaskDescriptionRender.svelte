<script lang="ts">
  import { onMount } from "svelte";
  import type { ResolvedChip } from "$lib/types/tasks";
  import * as tasksService from "$lib/services/tasks-service";

  interface Props {
    html: string;
  }

  let { html }: Props = $props();

  let resolvedChips = $state<Map<string, ResolvedChip>>(new Map());
  let container: HTMLElement | null = $state(null);

  onMount(async () => {
    const taskIds = tasksService.extractTaskIdsFromHtml(html);
    if (taskIds.length > 0) {
      resolvedChips = await tasksService.resolveChips(taskIds);
      enhanceChips();
    }
  });

  function enhanceChips() {
    if (!container) return;
    const chips = container.querySelectorAll<HTMLElement>("span[data-task-id]");
    chips.forEach((el) => {
      const id = el.getAttribute("data-task-id");
      if (!id) return;
      const chip = resolvedChips.get(id);
      if (!chip) return;

      if (chip.state === "live") {
        el.className =
          "inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-primary px-1.5 py-0.5 text-xs font-medium cursor-pointer border border-slate-200 dark:border-slate-700 hover:underline";
        el.textContent = `# ${chip.title}`;
        el.onclick = () => {
          if (chip.list_id) {
            window.location.href = `/tasks/lists/${chip.list_id}/tasks/${chip.id}`;
          }
        };
      } else if (chip.state === "trash") {
        el.className =
          "inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 text-xs font-medium cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 hover:opacity-80";
        el.textContent = `🗑 ${chip.title}`;
        el.onclick = () => {
          if (chip.list_id) {
            window.location.href = `/tasks/lists/${chip.list_id}/tasks/${chip.id}`;
          }
        };
      } else {
        el.className =
          "inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500 px-1.5 py-0.5 text-xs font-medium border border-rose-200 dark:border-rose-900 cursor-not-allowed";
        el.textContent = "⚠ Deleted task";
        el.onclick = null;
      }
    });
  }
</script>

<div
  bind:this={container}
  class="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 py-4"
>
  {@html html ||
    '<p class="text-slate-400 italic">No description provided.</p>'}
</div>
