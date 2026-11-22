<script lang="ts">
  import { onMount } from "svelte";
  import * as tasksService from "$lib/services/tasks-service";
  import type { CalendarTaskItem } from "$lib/services/tasks-service";
  import CalendarToolbar, { type CalendarViewMode } from "$lib/components/tasks/calendar/CalendarToolbar.svelte";
  import CalendarGrid from "$lib/components/tasks/calendar/CalendarGrid.svelte";
  import CalendarDayPanel from "$lib/components/tasks/calendar/CalendarDayPanel.svelte";

  let viewMode = $state<CalendarViewMode>("month");
  let anchorDate = $state<Date>(new Date());
  let includeCompleted = $state(false);
  let selectedDateStr = $state<string | null>(null);
  let tasks = $state<CalendarTaskItem[]>([]);
  let isLoading = $state(false);

  function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const visibleRange = $derived.by(() => {
    const y = anchorDate.getFullYear();
    const m = anchorDate.getMonth();
    if (viewMode === "day") {
      const s = toDateStr(anchorDate);
      return { start: s, end: s };
    }
    if (viewMode === "week") {
      const start = new Date(anchorDate);
      start.setDate(anchorDate.getDate() - anchorDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: toDateStr(start), end: toDateStr(end) };
    }
    const months = viewMode === "6month" ? 6 : viewMode === "2month" ? 2 : 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + months, 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  });

  const rangeLabel = $derived.by(() => {
    if (viewMode === "day") {
      return anchorDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    if (viewMode === "week") {
      return `Week of ${anchorDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (viewMode === "month") {
      return anchorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    const months = viewMode === "6month" ? 6 : 2;
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + months - 1, 1);
    const startStr = anchorDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const endStr = end.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    return `${startStr} – ${endStr}`;
  });

  const tasksByDate = $derived.by(() => {
    const map: Record<string, CalendarTaskItem[]> = {};
    for (const t of tasks) {
      const key = t.due_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  });

  async function loadRange() {
    isLoading = true;
    try {
      tasks = await tasksService.fetchTasksByDateRange(
        visibleRange.start,
        visibleRange.end,
        includeCompleted,
      );
    } finally {
      isLoading = false;
    }
  }

  function shiftDate(delta: number) {
    const d = new Date(anchorDate);
    if (viewMode === "day") d.setDate(d.getDate() + delta);
    else if (viewMode === "week") d.setDate(d.getDate() + delta * 7);
    else if (viewMode === "month") d.setMonth(d.getMonth() + delta);
    else if (viewMode === "2month") d.setMonth(d.getMonth() + delta * 2);
    else if (viewMode === "6month") d.setMonth(d.getMonth() + delta * 6);
    anchorDate = d;
    loadRange();
  }

  onMount(() => {
    loadRange();
  });
</script>

<svelte:head>
  <title>Tasks Calendar — The Commons</title>
</svelte:head>

<div class="cal-page">
  <CalendarToolbar
    {viewMode}
    {rangeLabel}
    {includeCompleted}
    onViewChange={(mode) => {
      viewMode = mode;
      loadRange();
    }}
    onPrev={() => shiftDate(-1)}
    onNext={() => shiftDate(1)}
    onToday={() => {
      anchorDate = new Date();
      loadRange();
    }}
    onToggleCompleted={() => {
      includeCompleted = !includeCompleted;
      loadRange();
    }}
  />

  <div class="cal-body" class:is-loading={isLoading}>
    <CalendarGrid
      {viewMode}
      {anchorDate}
      {tasksByDate}
      onSelectDay={(dateStr) => (selectedDateStr = dateStr)}
    />
  </div>

  {#if selectedDateStr}
    <CalendarDayPanel
      dateStr={selectedDateStr}
      tasks={tasksByDate[selectedDateStr] || []}
      onClose={() => (selectedDateStr = null)}
    />
  {/if}
</div>

<style>
  .cal-page {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .cal-body.is-loading {
    opacity: 0.65;
  }
</style>
