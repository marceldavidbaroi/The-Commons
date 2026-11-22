<script lang="ts">
  import type { CalendarTaskItem } from "$lib/services/tasks-service";

  interface Props {
    dateStr: string;
    tasks: CalendarTaskItem[];
    onClose: () => void;
  }

  let { dateStr, tasks, onClose }: Props = $props();

  const formattedDate = $derived.by(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  });

  function priorityColor(priority: CalendarTaskItem["priority"]): string {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      case "low":
        return "#3b82f6";
      default:
        return "currentColor";
    }
  }
</script>

<div class="cal-popover-backdrop" role="presentation" onclick={onClose}>
  <div
    class="cal-popover"
    role="dialog"
    aria-label={`Tasks for ${formattedDate}`}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="cal-popover-header">
      <span class="cal-popover-date">{formattedDate}</span>
      <button type="button" class="cal-popover-close" onclick={onClose} aria-label="Close">
        ×
      </button>
    </div>

    {#if tasks.length === 0}
      <p class="cal-popover-empty">No tasks due on this day.</p>
    {:else}
      <ul class="cal-popover-list">
        {#each tasks as task (task.id)}
          <li class="cal-popover-item">
            <span
              class="cal-popover-dot"
              style="background-color: {priorityColor(task.priority)};"
              title={task.priority}
            ></span>
            <a
              href={`/tasks/lists/${task.list_id}/tasks/${task.id}`}
              class="cal-popover-link"
              class:is-done={task.status === "done" || task.status === "cancelled"}
            >
              {task.title || "Untitled task"}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .cal-popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.25);
  }
  .cal-popover {
    width: min(22rem, 92vw);
    max-height: 70vh;
    overflow-y: auto;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #111827);
    border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.25));
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    padding: 0.75rem 1rem;
  }
  .cal-popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
  }
  .cal-popover-date {
    font-weight: 600;
    font-size: 0.875rem;
  }
  .cal-popover-close {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }
  .cal-popover-empty {
    font-size: 0.8125rem;
    opacity: 0.7;
    margin: 0.5rem 0;
  }
  .cal-popover-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .cal-popover-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .cal-popover-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .cal-popover-link {
    color: inherit;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cal-popover-link:hover {
    text-decoration: underline;
  }
  .cal-popover-link.is-done {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
