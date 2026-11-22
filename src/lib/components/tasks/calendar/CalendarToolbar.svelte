<script lang="ts">
  export type CalendarViewMode = "day" | "week" | "month" | "2month" | "6month";

  interface Props {
    viewMode: CalendarViewMode;
    rangeLabel: string;
    includeCompleted: boolean;
    onViewChange: (mode: CalendarViewMode) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onToggleCompleted: () => void;
  }

  let {
    viewMode,
    rangeLabel,
    includeCompleted,
    onViewChange,
    onPrev,
    onNext,
    onToday,
    onToggleCompleted,
  }: Props = $props();

  const views: Array<{ id: CalendarViewMode; label: string }> = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "2month", label: "2M" },
    { id: "6month", label: "6M" },
  ];
</script>

<header class="cal-toolbar">
  <div class="cal-toolbar-left">
    <a href="/tasks" class="tasks-btn tasks-btn-ghost cal-back-btn">
      <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span>Tasks</span>
    </a>
    <h1 class="cal-title">{rangeLabel}</h1>
  </div>

  <div class="cal-toolbar-right">
    <div class="cal-nav-group">
      <button type="button" class="tasks-btn tasks-btn-ghost cal-icon-btn" onclick={onPrev} aria-label="Previous">
        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button type="button" class="tasks-btn tasks-btn-ghost cal-today-btn" onclick={onToday}>
        Today
      </button>
      <button type="button" class="tasks-btn tasks-btn-ghost cal-icon-btn" onclick={onNext} aria-label="Next">
        <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <div class="cal-view-pills" role="tablist" aria-label="Calendar view">
      {#each views as v (v.id)}
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === v.id}
          class="cal-view-pill"
          class:active={viewMode === v.id}
          onclick={() => onViewChange(v.id)}
        >
          {v.label}
        </button>
      {/each}
    </div>

    <label class="cal-toggle">
      <input type="checkbox" checked={includeCompleted} onchange={onToggleCompleted} />
      <span>Done</span>
    </label>
  </div>
</header>

<style>
  .cal-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
  }
  .cal-toolbar-left,
  .cal-toolbar-right,
  .cal-nav-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cal-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }
  .cal-icon-btn {
    padding: 0.35rem 0.5rem;
  }
  .cal-today-btn {
    padding: 0.35rem 0.65rem;
    font-size: 0.8125rem;
  }
  .cal-view-pills {
    display: inline-flex;
    border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.25));
    border-radius: 0.375rem;
    overflow: hidden;
  }
  .cal-view-pill {
    background: transparent;
    border: none;
    padding: 0.3rem 0.6rem;
    font-size: 0.8125rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.75;
  }
  .cal-view-pill.active {
    background: var(--bg-muted, rgba(128, 128, 128, 0.16));
    font-weight: 600;
    opacity: 1;
  }
  .cal-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8125rem;
    cursor: pointer;
    user-select: none;
  }
</style>
