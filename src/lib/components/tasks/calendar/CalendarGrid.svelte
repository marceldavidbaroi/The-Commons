<script lang="ts">
  import type { CalendarTaskItem } from "$lib/services/tasks-service";
  import type { CalendarViewMode } from "./CalendarToolbar.svelte";

  interface Props {
    viewMode: CalendarViewMode;
    anchorDate: Date;
    tasksByDate: Record<string, CalendarTaskItem[]>;
    onSelectDay: (dateStr: string) => void;
  }

  let { viewMode, anchorDate, tasksByDate, onSelectDay }: Props = $props();

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const todayStr = toDateStr(new Date());

  function buildMonthCells(year: number, month: number) {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateStr: string; day: number; inMonth: boolean }> = [];

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, 1 - (startOffset - i));
      cells.push({ dateStr: toDateStr(d), day: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ dateStr: toDateStr(d), day, inMonth: true });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 1; i <= 7 - remainder; i++) {
        const d = new Date(year, month + 1, i);
        cells.push({ dateStr: toDateStr(d), day: d.getDate(), inMonth: false });
      }
    }
    return cells;
  }

  const monthsToRender = $derived.by(() => {
    const count = viewMode === "6month" ? 6 : viewMode === "2month" ? 2 : 1;
    const list: Array<{ year: number; month: number; label: string; cells: ReturnType<typeof buildMonthCells> }> = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        cells: buildMonthCells(d.getFullYear(), d.getMonth()),
      });
    }
    return list;
  });

  const weekDays = $derived.by(() => {
    const start = new Date(anchorDate);
    start.setDate(anchorDate.getDate() - anchorDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        dateStr: toDateStr(d),
        label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      };
    });
  });

  function dotColor(priority: CalendarTaskItem["priority"]): string {
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

{#if viewMode === "day"}
  {@const dateStr = toDateStr(anchorDate)}
  {@const dayTasks = tasksByDate[dateStr] || []}
  <div class="cal-day-view">
    <div class="cal-day-view-header">
      <span>{anchorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
      <span class="cal-count">{dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}</span>
    </div>
    {#if dayTasks.length === 0}
      <p class="cal-empty">No tasks due on this day.</p>
    {:else}
      <ul class="cal-task-list">
        {#each dayTasks as task (task.id)}
          <li>
            <span class="cal-dot" style="background-color: {dotColor(task.priority)};"></span>
            <a href={`/tasks/lists/${task.list_id}/tasks/${task.id}`} class="cal-task-link">
              {task.title || "Untitled task"}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{:else if viewMode === "week"}
  <div class="cal-week-grid">
    {#each weekDays as wd (wd.dateStr)}
      {@const dayTasks = tasksByDate[wd.dateStr] || []}
      <div class="cal-week-col" class:is-today={wd.dateStr === todayStr}>
        <button type="button" class="cal-week-col-header" onclick={() => onSelectDay(wd.dateStr)}>
          <span>{wd.label}</span>
          {#if dayTasks.length > 0}
            <span class="cal-badge">{dayTasks.length}</span>
          {/if}
        </button>
        <div class="cal-week-col-body">
          {#each dayTasks as task (task.id)}
            <a href={`/tasks/lists/${task.list_id}/tasks/${task.id}`} class="cal-week-task">
              <span class="cal-dot" style="background-color: {dotColor(task.priority)};"></span>
              <span class="cal-week-task-title">{task.title || "Untitled"}</span>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div
    class="cal-months-container"
    class:is-two={viewMode === "2month"}
    class:is-six={viewMode === "6month"}
  >
    {#each monthsToRender as m (`${m.year}-${m.month}`)}
      <section class="cal-month-block">
        {#if viewMode !== "month"}
          <h2 class="cal-month-heading">{m.label}</h2>
        {/if}
        <div class="cal-grid-7">
          {#each WEEKDAYS as wd (wd)}
            <div class="cal-weekday">{wd}</div>
          {/each}
          {#each m.cells as cell (cell.dateStr)}
            {@const dayTasks = tasksByDate[cell.dateStr] || []}
            <button
              type="button"
              class="cal-cell"
              class:outside={!cell.inMonth}
              class:is-today={cell.dateStr === todayStr}
              class:has-tasks={dayTasks.length > 0}
              onclick={() => onSelectDay(cell.dateStr)}
            >
              <span class="cal-cell-num">{cell.day}</span>
              {#if dayTasks.length > 0}
                <div class="cal-dots" aria-label={`${dayTasks.length} tasks`}>
                  {#each dayTasks.slice(0, 4) as t (t.id)}
                    <span class="cal-dot" style="background-color: {dotColor(t.priority)};"></span>
                  {/each}
                  {#if dayTasks.length > 4}
                    <span class="cal-more">+{dayTasks.length - 4}</span>
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  .cal-months-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  .cal-months-container.is-two {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
  .cal-months-container.is-six {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .cal-month-heading {
    font-size: 0.9375rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }
  .cal-grid-7 {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    border-top: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    border-left: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
  }
  .cal-weekday {
    padding: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    opacity: 0.7;
    border-right: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
  }
  .cal-cell {
    min-height: 3.5rem;
    padding: 0.35rem;
    background: transparent;
    border: none;
    border-right: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    cursor: pointer;
    color: inherit;
    text-align: left;
  }
  .cal-cell:hover {
    background: var(--bg-muted, rgba(128, 128, 128, 0.08));
  }
  .cal-cell.outside {
    opacity: 0.4;
  }
  .cal-cell.is-today .cal-cell-num {
    background: var(--accent, #2563eb);
    color: #fff;
    border-radius: 9999px;
    padding: 0.1rem 0.4rem;
  }
  .cal-cell-num {
    font-size: 0.8125rem;
    font-weight: 500;
  }
  .cal-dots {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2rem;
    margin-top: 0.25rem;
  }
  .cal-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .cal-more {
    font-size: 0.6875rem;
    opacity: 0.75;
  }
  .cal-week-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .cal-week-col {
    border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    border-radius: 0.375rem;
    min-height: 14rem;
    display: flex;
    flex-direction: column;
  }
  .cal-week-col.is-today {
    border-color: var(--accent, #2563eb);
  }
  .cal-week-col-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    cursor: pointer;
    color: inherit;
  }
  .cal-week-col-body {
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .cal-week-task {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: inherit;
    text-decoration: none;
  }
  .cal-week-task:hover {
    text-decoration: underline;
  }
  .cal-week-task-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cal-badge {
    font-size: 0.6875rem;
    opacity: 0.75;
  }
  .cal-day-view {
    border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
  }
  .cal-day-view-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .cal-count,
  .cal-empty {
    font-size: 0.8125rem;
    opacity: 0.7;
  }
  .cal-task-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .cal-task-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cal-task-link {
    color: inherit;
    text-decoration: none;
  }
  .cal-task-link:hover {
    text-decoration: underline;
  }
</style>
