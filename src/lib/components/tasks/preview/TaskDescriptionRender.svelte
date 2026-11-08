<script lang="ts">
  import { onMount } from "svelte";
  import type { ResolvedChip } from "$lib/types/tasks";
  import * as tasksService from "$lib/services/tasks-service";

  interface Props {
    html: string;
  }

  let { html }: Props = $props();

  let resolvedChips = $state<Map<number, ResolvedChip>>(new Map());
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
      const idAttr = el.getAttribute("data-task-id");
      if (!idAttr) return;
      const id = Number(idAttr);
      if (isNaN(id)) return;
      const chip = resolvedChips.get(id);
      if (!chip) return;

      if (chip.state === "live") {
        el.className = "tasks-badge";
        el.style.color = "var(--primary)";
        el.style.cursor = "pointer";
        el.textContent = `# ${chip.title}`;
        el.onclick = () => {
          if (chip.list_id) {
            window.location.href = `/tasks/lists/${chip.list_id}/tasks/${chip.id}`;
          }
        };
      } else if (chip.state === "trash") {
        el.className = "tasks-badge";
        el.style.color = "var(--text-muted)";
        el.style.border = "1px dashed var(--border-subtle)";
        el.style.cursor = "pointer";
        el.textContent = `🗑 ${chip.title}`;
        el.onclick = () => {
          if (chip.list_id) {
            window.location.href = `/tasks/lists/${chip.list_id}/tasks/${chip.id}`;
          }
        };
      } else {
        el.className = "tasks-badge";
        el.style.color = "var(--danger)";
        el.style.border = "1px solid var(--danger)";
        el.style.cursor = "not-allowed";
        el.textContent = "⚠ Deleted task";
        el.onclick = null;
      }
    });
  }
</script>

<div
  bind:this={container}
  class="tasks-rendered-desc"
  style="padding: 1rem 0; line-height: 1.6; color: var(--text-primary);"
>
  {@html html ||
    '<p style="color: var(--text-muted); font-style: italic;">No description provided.</p>'}
</div>

<style>
  :global(.tasks-rendered-desc p) {
    margin-bottom: 0.5rem;
  }
  :global(.tasks-rendered-desc ul) {
    padding-left: 1.25rem;
    margin-bottom: 0.5rem;
  }
  :global(.tasks-rendered-desc table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0;
  }
  :global(.tasks-rendered-desc th, .tasks-rendered-desc td) {
    border: 1px solid var(--border-subtle);
    padding: 0.4rem 0.6rem;
  }
</style>
