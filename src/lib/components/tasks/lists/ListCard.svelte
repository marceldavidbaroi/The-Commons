<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";

  interface Props {
    list: ListRecord;
    onTrash?: (id: number | string) => void;
  }

  let { list }: Props = $props();
</script>

<a
  href={`/tasks/lists/${list.id}`}
  class="tasks-card"
  style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; text-decoration: none;"
>
  <span class="tasks-card-title">{list.name}</span>
  <span style="font-size: 0.875rem; color: var(--color-ink-muted); white-space: nowrap;">
    {list.live_tasks_count} {list.live_tasks_count === 1 ? "task" : "tasks"}
  </span>
</a>
